import {Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {
  ButtonComponent,
  CellDefDirective,
  ColumnConfig,
  CompactRowDefDirective,
  DataTableComponent,
  DialogService,
  FormFieldComponent,
  HeaderDefDirective,
  IconComponent,
  LabelComponent,
  OptionComponent,
  PageEvent,
  SelectComponent,
  SortState,
  TooltipDirective,
} from '../../../../ui-components';
import {ConfirmationDialogComponent, ConfirmationDialogData} from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import {injectListingPane, injectListingState} from '../../../shared/components/listing-pane/listing-pane';
import {escapeHtml} from '../../../shared/components/media/media-files';
import {HasPermissionDirective} from '../../../shared/directives/HasPermissionDirective';
import {ConfigurationService} from '../../../shared/services/configuration.service';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {attributeName, ENTITIES_URL, entityName, hasAmgShop, listedEntityName, loadEntityAttributes, loadEntitySettings, translatedTypes, valueAt} from '../entities-shared';
import {EntitiesService} from '../entities.service';
import {Entity, EntityAttribute, EntitySearchTerm, EntityType} from '../entities.types';
import {CustomerGroupsDialogComponent} from '../groups/customer-groups-dialog.component';
import {EntitiesTranslationPipe} from '../i18n/entities.translation';

/** A column of the chosen type; `kind` tells the columns of their own kind from those that show a field */
interface ListColumn {
  key: string;
  kind: 'field' | 'wallets' | 'groupNames' | 'email' | 'emailHidden' | 'sap' | 'activated';
  label: string;
  /** The property the header's filter searches; none for a column without a filter */
  filter?: string;
}

interface EntityRow {
  _id: string;
  entity: Entity;
  /** As the delete question names the customer: by e-mail address where it has no name */
  name: string;
  /** The customer's name alone, for the compact list */
  title: string;
  email: string;
  protected: boolean;
  /** What each field column shows, by the column's key */
  cells: Record<string, string>;
  wallet: string;
  groupNames: string;
  sapNumber: string | null;
  activated: boolean;
  deletable: boolean;
}

/** What the listing shows, kept for coming back from a customer and for the compact list next to one */
interface EntitiesListingState {
  page: number;
  pageSize: number;
  sort: SortState;
  type: string | null;
  organisation: string | null;
  attribute: string | null;
  value: unknown;
  typed: Record<string, string>;
}

/** The header filters wait for typing to pause, as in the old listing */
const FILTER_DELAY_MS = 500;
const LOCK = '__protected';
const CUSTOMER_GROUP = '__customer_group';

/**
 * The customers of one type in the columns the `entities:juicebox:settings` configuration gives that type, with a
 * filter in each field column's header, sorted and paged on the server. Above it: the type, the organisation (super
 * admins) and a filter by an attribute's value. A response that arrives after a newer request is dropped. Next to an
 * open customer (the split view) it is the compact list of the rows it showed last.
 */
@Component({
  selector: 'app-entities-listing',
  templateUrl: './entities-listing.component.html',
  styleUrl: './entities-listing.component.scss',
  imports: [
    RouterLink,
    DataTableComponent,
    CellDefDirective,
    CompactRowDefDirective,
    HeaderDefDirective,
    ButtonComponent,
    IconComponent,
    TooltipDirective,
    FormFieldComponent,
    LabelComponent,
    SelectComponent,
    OptionComponent,
    HasPermissionDirective,
    EntitiesTranslationPipe,
  ],
  providers: [EntitiesTranslationPipe],
})
export class EntitiesListingComponent implements OnInit, OnDestroy {
  /** Set when this is the compact list next to an open customer, not the page itself */
  protected readonly pane = injectListingPane();
  private readonly listingState = injectListingState<EntitiesListingState>('entities');
  private readonly entities = inject(EntitiesService);
  private readonly configuration = inject(ConfigurationService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly dialog = inject(DialogService);
  private readonly router = inject(Router);
  private readonly i18n = inject(EntitiesTranslationPipe);

  protected readonly detailsUrl = `${ENTITIES_URL}/details`;
  protected readonly isSuperAdmin = !!this.juicebox.hasPermission('entities:role#super-admin');
  protected readonly lockKey = LOCK;
  protected readonly customerGroupKey = CUSTOMER_GROUP;

  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly pageSizeOptions = [10, 20, 30, 50];
  /** As in the old listing: by last name until a column is sorted */
  protected readonly sort = signal<SortState>({prop: 'lastname', dir: 'asc'});
  protected readonly count = signal(0);
  protected readonly types = signal<EntityType[]>([]);
  protected readonly selectedType = signal<EntityType | null>(null);
  /** The chosen type by its place in the list: the type that lists every customer has no value of its own to choose it by */
  protected readonly selectedTypeIndex = computed(() => this.types().indexOf(this.selectedType()!));
  protected readonly organisations = signal<Entity[]>([]);
  protected readonly selectedOrganisation = signal<string | null>(null);
  /** Every attribute field, read once; the chosen type's are offered as a filter, named in the admin's language */
  private readonly allAttributes = signal<EntityAttribute[]>([]);
  protected readonly attributeOptions = computed(() => {
    const model = `entity:${this.selectedType()?.prop}`;
    const language = this.juicebox.getLanguage();
    return this.allAttributes()
      .filter(attribute => attribute.model === model)
      .map(attribute => ({property: attribute.property, name: attributeName(attribute, this.i18n, language)}));
  });
  protected readonly attribute = signal<string | null>(null);
  protected readonly values = signal<Array<{value: unknown}>>([]);
  protected readonly value = signal<unknown>(null);
  private readonly amgShop = signal(false);
  private readonly fetched = signal<Entity[]>([]);
  private readonly groupNames = signal<ReadonlyMap<string, string>>(new Map());
  /** What is typed in the header filters, by the property each searches */
  protected readonly typed = signal<Record<string, string>>({});
  private filterTimer?: ReturnType<typeof setTimeout>;
  private request = 0;
  /** Set when the listing is left: what a late answer would still set on the page is then another page's */
  private destroyed = false;

  /** The chosen type's columns, the six of their own kind told apart */
  protected readonly listColumns = computed<ListColumn[]>(() =>
    (this.selectedType()?.columns ?? []).map(column => {
      const label = String(this.i18n.transform(column.name));
      switch (column.prop) {
        case 'wallets': return {key: column.prop, kind: 'wallets', label};
        case 'groupNames': return {key: column.prop, kind: 'groupNames', label: String(this.i18n.transform('group')), filter: 'group'};
        case 'email': return {key: column.prop, kind: 'email', label: String(this.i18n.transform('email')), filter: 'email'};
        case 'email-hidden': return {key: column.prop, kind: 'emailHidden', label: String(this.i18n.transform('email')), filter: 'email'};
        case 'sap': return {key: column.prop, kind: 'sap', label};
        case 'activated': return {key: column.prop, kind: 'activated', label};
        default: return {key: column.prop, kind: 'field', label, filter: column.prop};
      }
    }));
  protected readonly filterColumns = computed(() => this.listColumns().filter(column => column.filter));
  /** How the chosen type shows the e-mail address: in clear, hidden until pointed at, or not at all */
  protected readonly emailShown = computed<'clear' | 'hidden' | null>(() => {
    const kinds = this.listColumns().map(column => column.kind);
    return kinds.includes('emailHidden') ? 'hidden' : kinds.includes('email') ? 'clear' : null;
  });
  protected readonly fieldColumns = computed(() => this.listColumns().filter(column => column.kind === 'field'));
  /** The first field column names the row: its cell is the link to the customer */
  protected readonly nameColumn = computed(() => this.fieldColumns()[0]?.key ?? null);

  protected readonly columns = computed<ColumnConfig[]>(() => {
    const nameColumn = this.nameColumn();
    return [
      {key: LOCK, label: String(this.i18n.transform('protected')), width: '48px', align: 'center', ellipsis: false},
      ...this.listColumns().map<ColumnConfig>(column => ({
        key: column.key,
        label: column.label,
        sortable: column.kind === 'field' || column.kind === 'email' || column.kind === 'emailHidden',
        ...(column.kind === 'sap' || column.kind === 'activated' ? {ellipsis: false} : {}),
        ...(column.key === nameColumn ? {listRole: 'name' as const} : {}),
      })),
      ...(this.amgShop() ? [{key: CUSTOMER_GROUP, label: String(this.i18n.transform('customer_group'))}] : []),
      {key: 'actions', label: String(this.i18n.transform('actions')), width: '96px', align: 'right', ellipsis: false},
    ];
  });

  protected readonly rows = computed<EntityRow[]>(() => {
    const fields = this.fieldColumns();
    const names = this.groupNames();
    return this.fetched().map(entity => ({
      _id: entity._id,
      entity,
      name: listedEntityName(entity),
      title: entity.type === 'organisation' ? entity.name ?? '' : entityName(entity),
      email: entity.email ?? '',
      protected: !!entity.protected,
      cells: Object.fromEntries(fields.map(column => [column.key, text(valueAt(entity, column.key))])),
      wallet: entity.wallets?.[0]?.address ?? '',
      groupNames: (entity.groups ?? []).map(group => names.get(String(group))).filter(Boolean).join(', '),
      sapNumber: entity.mappings?.SAP ? (entity.mappings.SAP.external_id ?? '') : null,
      activated: !!entity.attributes?.['activated'],
      deletable: !entity.noDelete,
    }));
  });

  async ngOnInit(): Promise<void> {
    // Back from a customer, and in the compact list next to one: what the listing showed last
    const state = this.listingState.restore();
    if (state) {
      this.page.set(state.page);
      this.pageSize.set(state.pageSize);
      this.sort.set(state.sort);
      this.selectedOrganisation.set(state.organisation);
      this.attribute.set(state.attribute);
      this.value.set(state.value);
      this.typed.set(state.typed);
    }
    if (!this.pane) {
      this.juicebox.navigationEvent({
        location: this.i18n.transform('customers'),
        subject: this.i18n.transform('listing'),
        link: ENTITIES_URL,
      });
      this.showActionButtons(false);
    }

    // The compact list has no filters above it: it needs neither the attribute fields nor their values
    const [settings, amgShop, attributes] = await Promise.all([
      loadEntitySettings(this.configuration),
      hasAmgShop(this.configuration),
      this.pane ? Promise.resolve([]) : loadEntityAttributes(this.configuration),
    ]);
    if (this.destroyed) return;
    this.amgShop.set(amgShop);
    this.allAttributes.set(attributes);
    if (amgShop && !this.pane) this.showActionButtons(true);
    const types = translatedTypes(settings, this.i18n);
    this.types.set(types);
    // Without configured types there is nothing to list
    if (!types.length) return;
    this.selectedType.set((state && types.find(type => (type.prop ?? '') === (state.type ?? ''))) || types[0]);
    if (!this.pane) {
      if (this.attribute()) void this.loadValues();
      if (this.selectedOrganisation()) void this.loadOrganisations();
    }
    await this.fetch();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    clearTimeout(this.filterTimer);
  }

  /** Another type: its columns and attribute fields, from the first page */
  protected async selectType(index: number): Promise<void> {
    const type = this.types()[index];
    if (!type || type === this.selectedType()) return;
    this.selectedType.set(type);
    this.page.set(1);
    await this.fetch();
  }

  protected async loadOrganisations(): Promise<void> {
    const result = await this.entities.fetch(0, this.pageSize(), {type: 'organisation'});
    if (result?.success) this.organisations.set(result.payload?.items ?? []);
  }

  protected selectOrganisation(organisation: string | null): void {
    this.selectedOrganisation.set(organisation ?? null);
    void this.fetch();
  }

  /** The attribute to filter by: its values are offered next */
  protected selectAttribute(property: string | null): void {
    if (!property) return;
    this.attribute.set(property);
    this.value.set(null);
    void this.loadValues();
  }

  protected selectValue(value: unknown): void {
    if (!hasValue(value)) return;
    this.value.set(value);
    void this.fetch();
  }

  protected resetAttributeFilter(): void {
    this.attribute.set(null);
    this.value.set(null);
    this.values.set([]);
    void this.fetch();
  }

  protected onFilter(property: string, term: string): void {
    this.typed.update(typed => {
      const {[property]: _dropped, ...rest} = typed;
      return term ? {...rest, [property]: term} : rest;
    });
    clearTimeout(this.filterTimer);
    this.filterTimer = setTimeout(() => {
      this.page.set(1);
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
    this.page.set(sizeChanged ? 1 : event.pageIndex + 1);
    void this.fetch();
  }

  protected open(row: EntityRow): void {
    void this.router.navigate([this.detailsUrl, row._id, 'details-entity']);
  }

  /** Asks first; an organisation is asked about differently where the staff member runs a marketplace */
  protected remove(row: EntityRow): void {
    const name = escapeHtml(row.name);
    const organisation = row.entity.type === 'organisation' && this.juicebox.hasRole('marketplace:role');
    const data: ConfirmationDialogData = {
      completeMessage: organisation
        ? `${name} - ${this.i18n.transform('are_you_sure_you_want_to_delete_org')}`
        : `${this.i18n.transform('are_you_sure_you_want_to_delete_customer')} ${name}`,
      confirm: 'delete',
      destructive: true,
    };
    this.dialog
      .open<ConfirmationDialogComponent, ConfirmationDialogData, boolean>(ConfirmationDialogComponent, {data})
      .closed.subscribe(async confirmed => {
        if (!confirmed) return;
        const result = await this.entities.delete(row._id);
        if (!result?.success) {
          this.juicebox.showToast('error', this.i18n.transform('error'), result?.error);
          return;
        }
        this.juicebox.showToast('success', this.i18n.transform('success'));
        this.page.set(1);
        await this.fetch();
      });
  }

  private showActionButtons(withCustom: boolean): void {
    this.juicebox.setActionButtons([
      {
        title: this.i18n.transform('customer_groups'),
        icon: 'group',
        type: 'btn-primary',
        permissionsHide: 'entities:role#create',
        // Returns nothing: the workspace bar would take a returned dialog for something to wait on
        callback: () => void this.dialog.open(CustomerGroupsDialogComponent, {width: '600px'}),
      },
      {
        title: this.i18n.transform('add_new'),
        icon: 'add',
        type: 'btn-primary',
        permissionsHide: 'entities:role#create',
        // The create page starts with the listing's type, passed as the old juicebox passed it
        callback: () => this.router.navigate([`${ENTITIES_URL}/entity-wizard`], {state: {selectedType: this.selectedType(), types: this.types()}}),
      },
      // With `amgshop`: the buttons the project's other modules registered (EntitiesService.addCustomActionButton)
      ...(withCustom ? this.entities.customActionButtons : []),
    ]);
  }

  private async loadValues(): Promise<void> {
    const attribute = this.attribute();
    if (!attribute) return;
    const result = await this.entities.searchAttributeValues({attribute, type: this.selectedType()?.prop});
    if (result?.success && attribute === this.attribute()) this.values.set(result.payload ?? []);
  }

  private async fetch(): Promise<void> {
    const type = this.selectedType();
    if (!type) return;
    const request = ++this.request;
    const sort = this.sort();
    const attribute = this.attribute();
    const value = this.value();
    this.saveState();
    const result = await this.entities.fetch(this.page() - 1, this.pageSize(), {
      type: type.prop,
      organisation: this.selectedOrganisation() ?? undefined,
      sort: sort.dir ? {prop: sortProperty(sort.prop), dir: sort.dir as 'asc' | 'desc'} : undefined,
      filter: Object.entries(this.typed()).map(([property, term]) => searchTerm(property, term)),
      attribute: attribute && hasValue(value) ? {[attribute]: value} : null,
    });
    if (request !== this.request || !result?.success) return;
    const items = result.payload?.items ?? [];
    const count = result.payload?.count ?? 0;
    // Fewer customers than when the listing was left or filtered: its last page
    const lastPage = Math.max(Math.ceil(count / this.pageSize()), 1);
    if (!items.length && this.page() > lastPage) {
      this.page.set(lastPage);
      return this.fetch();
    }
    this.fetched.set(items);
    this.count.set(count);
    void this.loadGroupNames(items);
  }

  /** The names of the groups the rows are in, each read once */
  private async loadGroupNames(items: Entity[]): Promise<void> {
    const shown = this.amgShop() || this.listColumns().some(column => column.kind === 'groupNames');
    if (!shown) return;
    const known = this.groupNames();
    const missing = [...new Set(items.flatMap(entity => (entity.groups ?? []).map(String)))].filter(id => !known.has(id));
    if (!missing.length) return;
    const results = await Promise.all(missing.map(id => this.entities.getGroupById(id)));
    const names = new Map(this.groupNames());
    results.forEach((result, index) => {
      if (result?.success && result.payload) names.set(missing[index], result.payload.name);
    });
    this.groupNames.set(names);
  }

  private saveState(): void {
    this.listingState.save({
      page: this.page(),
      pageSize: this.pageSize(),
      sort: this.sort(),
      type: this.selectedType()?.prop ?? null,
      organisation: this.selectedOrganisation(),
      attribute: this.attribute(),
      value: this.value(),
      typed: this.typed(),
    });
  }
}

/** A header filter's term, as the old listing sent it */
function searchTerm(property: string, term: string): EntitySearchTerm {
  return {property, term, fullText: true, language: false, languages: null};
}

/** The hidden e-mail column sorts by the e-mail address */
function sortProperty(key: string): string {
  return key === 'email-hidden' ? 'email' : key;
}

/** Whether a value was chosen: `false` and `0` are values too */
function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== '';
}

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}
