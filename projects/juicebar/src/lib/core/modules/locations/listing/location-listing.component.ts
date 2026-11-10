import {Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {Location} from '@angular/common';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {
  ButtonComponent,
  CellDefDirective,
  ColumnConfig,
  CompactRowDefDirective,
  DataTableComponent,
  DialogService,
  HeaderDefDirective,
  IconComponent,
  PageEvent,
  SegmentedComponent,
  SegmentedOption,
  SlideToggleComponent,
  SortState,
  TooltipDirective,
} from '../../../../ui-components';
import {ConfirmationDialogComponent, ConfirmationDialogData} from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import {injectListingPane, ListingStateService} from '../../../shared/components/listing-pane/listing-pane';
import {escapeHtml} from '../../../shared/components/media/media-files';
import {AutoLanguagePipe} from '../../../shared/pipes/auto-language.pipe';
import {ConfigurationService} from '../../../shared/services/configuration.service';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {LocationsTranslationPipe} from '../i18n/locations.translation';
import {storedLocationUpdate} from '../location-form';
import {countryName, injectLocationsOptions, loadLocationTypes} from '../locations-shared';
import {LocationsService} from '../locations.service';
import {StoredLocation, LocationType} from '../locations.types';

type Owner = 'all' | 'mine' | 'public';

interface LocationRow {
  _id: string;
  location: StoredLocation;
  name: string;
  type: string;
  city: string;
  country: string;
  /** Type and city, the line under the name in the compact list */
  summary: string;
  archivable: boolean;
  deletable: boolean;
}

/** What the listing shows, kept for the compact list next to an open location */
interface LocationsListingState {
  page: number;
  pageSize: number;
  sort: SortState;
  archived: boolean;
  owner: Owner;
  typed: Array<{key: string; value: string}>;
}

/** Text filters wait for typing to pause, as in the QC listing */
const FILTER_DELAY_MS = 300;

/**
 * The locations of the types the user may see, filtered by name, city and country in the table header, sorted on
 * the server, with archived ones on request. The page is kept in the URL, so going back from a location returns to
 * it. A response that arrives after a newer request is dropped. Next to an open location (the split view) it is the
 * compact list of the rows it showed last.
 */
@Component({
  selector: 'app-location-listing',
  templateUrl: './location-listing.component.html',
  styleUrl: './location-listing.component.scss',
  imports: [
    RouterLink,
    DataTableComponent,
    CellDefDirective,
    CompactRowDefDirective,
    HeaderDefDirective,
    ButtonComponent,
    IconComponent,
    TooltipDirective,
    SegmentedComponent,
    SlideToggleComponent,
    LocationsTranslationPipe,
  ],
  providers: [LocationsTranslationPipe],
})
export class LocationListingComponent implements OnInit, OnDestroy {
  /** Set when this is the compact list next to an open location, not the page itself */
  protected readonly pane = injectListingPane();
  private readonly listingState = inject(ListingStateService);
  private readonly locations = inject(LocationsService);
  private readonly configuration = inject(ConfigurationService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly dialog = inject(DialogService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly addressBar = inject(Location);
  private readonly i18n = inject(LocationsTranslationPipe);
  private readonly autoLanguage = new AutoLanguagePipe(this.juicebox);
  protected readonly options = injectLocationsOptions();
  private readonly language = this.juicebox.getLanguage();
  private readonly systemLanguages = this.juicebox.getAllSystemLanguages();
  private readonly archivableTypes = this.options.archivableTypes ?? [];
  private readonly deletableTypes = this.options.deletableTypes ?? ['region'];

  protected readonly page = signal(pageFrom(this.route.snapshot.queryParamMap.get('page')));
  protected readonly pageSize = signal(10);
  protected readonly pageSizeOptions = [10, 20, 30, 50];
  protected readonly sort = signal<SortState>({prop: '', dir: ''});
  protected readonly archived = signal(false);
  protected readonly owner = signal<Owner>('all');
  protected readonly ownerOptions: SegmentedOption<Owner>[] = (['all', 'mine', 'public'] as const)
    .map(value => ({value, label: this.i18n.transform(value)}));
  protected readonly count = signal(0);
  private readonly fetched = signal<StoredLocation[]>([]);
  private readonly types = signal<LocationType[]>([]);
  private readonly organisationId = signal<string | null>(null);
  private typed: Array<{key: string; value: string}> = [];
  private filterTimer?: ReturnType<typeof setTimeout>;
  private request = 0;

  /** The "Show locations" filter works on the page shown, as in QC */
  protected readonly rows = computed<LocationRow[]>(() => {
    const owner = this.owner();
    const types = this.types();
    const organisationId = this.organisationId();
    return this.fetched()
      .filter(location => owner === 'all' || (owner === 'mine') === (location.organisation_id === organisationId))
      .map(location => this.toRow(location, types));
  });

  protected readonly columns: ColumnConfig[] = [
    {key: 'name', label: this.i18n.transform('name'), sortable: true},
    {key: 'type', label: this.i18n.transform('type')},
    {key: 'address.0.city', label: this.i18n.transform('city'), sortable: true},
    {key: 'address.0.country', label: this.i18n.transform('country'), sortable: true},
    {key: 'actions', label: this.i18n.transform('actions'), width: '140px', align: 'right', ellipsis: false},
  ];

  async ngOnInit(): Promise<void> {
    if (this.pane) {
      const state = this.listingState.restore<LocationsListingState>('location');
      if (state) {
        this.page.set(state.page);
        this.pageSize.set(state.pageSize);
        this.sort.set(state.sort);
        this.archived.set(state.archived);
        this.owner.set(state.owner);
        this.typed = state.typed;
      }
    } else {
      this.juicebox.navigationEvent({
        location: this.i18n.transform('location'),
        subject: this.i18n.transform('location_list'),
        link: 'main/location',
      });
      this.juicebox.setActionButtons([{
        title: this.i18n.transform('add_new'),
        type: 'btn-primary',
        icon: 'add',
        permissions: 'locations:role#create',
        callback: () => this.router.navigate(['/main/location/location-wizard']),
      }]);
    }

    const [types, organisation] = await Promise.all([
      loadLocationTypes(this.configuration, this.juicebox),
      this.options.ownerFilter ? this.juicebox.getLoggedInOrganisation() : Promise.resolve(null),
    ]);
    this.types.set(types);
    this.organisationId.set(organisation?._id ?? null);
    await this.fetch();
  }

  ngOnDestroy(): void {
    clearTimeout(this.filterTimer);
  }

  protected onFilter(key: string, value: string): void {
    const filterKey = key === 'name' ? `name.${this.language}` : key;
    this.typed = [
      ...this.typed.filter(filter => filter.key !== filterKey),
      ...(value ? [{key: filterKey, value}] : []),
    ];
    clearTimeout(this.filterTimer);
    this.filterTimer = setTimeout(() => {
      this.setPage(1);
      void this.fetch();
    }, FILTER_DELAY_MS);
  }

  /** As in the old listing, sorting keeps the page */
  protected onSort(sort: SortState): void {
    this.sort.set(sort);
    void this.fetch();
  }

  protected onPage(event: PageEvent): void {
    const sizeChanged = event.pageSize !== this.pageSize();
    this.pageSize.set(event.pageSize);
    this.setPage(sizeChanged ? 1 : event.pageIndex + 1);
    void this.fetch();
  }

  protected showArchived(archived: boolean): void {
    this.archived.set(archived);
    this.setPage(1);
    void this.fetch();
  }

  protected open(row: LocationRow): void {
    void this.router.navigate(['/main/location/details', row._id]);
  }

  protected remove(row: LocationRow): void {
    const data: ConfirmationDialogData = {
      completeMessage: this.i18n.transform('delete_location_question', {name: escapeHtml(row.name)}),
      confirm: 'delete',
      destructive: true,
    };
    this.dialog
      .open<ConfirmationDialogComponent, ConfirmationDialogData, boolean>(ConfirmationDialogComponent, {data})
      .closed.subscribe(async confirmed => {
        if (!confirmed) return;
        const result = await this.locations.delete(row._id);
        if (!result?.success) {
          // The service tells why, e.g. location_assigned_to_training
          this.juicebox.showToast('error', this.translated(result?.error, 'delete_failed'));
          return;
        }
        this.juicebox.showToast('success', this.i18n.transform('location_deleted'));
        await this.fetch();
      });
  }

  protected async archive(row: LocationRow, archived: boolean): Promise<void> {
    const update = storedLocationUpdate(row.location, this.language, row.name, archived);
    const result = await this.locations.put(row._id, update);
    if (!result?.success) {
      this.juicebox.showToast('error', this.i18n.transform(archived ? 'location_archived_error' : 'location_unarchived_error'));
      return;
    }
    this.juicebox.showToast('success', this.i18n.transform(archived ? 'location_archived' : 'location_unarchived'));
    await this.fetch();
  }

  private async fetch(): Promise<void> {
    const request = ++this.request;
    const sort = this.sort();
    this.listingState.save('location', {
      page: this.page(),
      pageSize: this.pageSize(),
      sort,
      archived: this.archived(),
      owner: this.owner(),
      typed: this.typed,
    } satisfies LocationsListingState);
    const result = await this.locations.fetch(this.page() - 1, this.pageSize(), {
      filters: {
        archived: this.archived(),
        typed: this.typed,
        ...(sort.dir && {sort}),
        types: this.types().map(type => type.value),
      },
      language: this.language,
      populateCountry: true,
    });
    if (request !== this.request || !result?.success || !result.payload) return;
    this.fetched.set(result.payload.locations);
    this.count.set(result.payload.count);
  }

  /**
   * Keeps the page in the URL, as QC does: the address is replaced without a navigation, which would also take the
   * page's action buttons away
   */
  private setPage(page: number): void {
    this.page.set(page);
    // The compact list isn't the page: the address is the open location's
    if (this.pane) return;
    const url = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: {page: page > 1 ? page : null},
      queryParamsHandling: 'merge',
    });
    this.addressBar.replaceState(this.router.serializeUrl(url));
  }

  private toRow(location: StoredLocation, types: LocationType[]): LocationRow {
    const address = location.address?.[0];
    const country = address?.country;
    const type = types.find(option => option.value === location.type);
    const archivable = this.archivableTypes.includes(location.type ?? '');
    const typeName = type?.localised_name ? this.autoLanguage.transform(type.localised_name) : (location.type ?? '-');
    return {
      _id: location._id,
      location,
      name: this.autoLanguage.transform(location.name ?? '', this.language, this.systemLanguages),
      type: typeName,
      city: address?.city || '-',
      summary: [typeName, address?.city].filter(part => part && part !== '-').join(' · '),
      country: country && typeof country === 'object' ? countryName(country, this.language) : '-',
      archivable,
      deletable: this.deletableTypes.includes(location.type ?? ''),
    };
  }

  private translated(key: string | undefined, fallback: string): string {
    const text = key ? this.i18n.transform(key) : '';
    return typeof text === 'string' && text && !text.startsWith('@') ? text : this.i18n.transform(fallback);
  }
}

function pageFrom(param: string | null): number {
  const page = Number(param);
  return Number.isInteger(page) && page > 0 ? page : 1;
}
