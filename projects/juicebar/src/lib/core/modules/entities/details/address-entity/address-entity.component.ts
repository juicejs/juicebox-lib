import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {
  ButtonComponent,
  CellDefDirective,
  ColumnConfig,
  DataTableComponent,
  DialogService,
  IconComponent,
  PageEvent,
  SortState,
  TooltipDirective,
} from '../../../../../ui-components';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {EntitiesService} from '../../entities.service';
import {EntityAddress} from '../../entities.types';
import {EntitiesTranslationPipe} from '../../i18n/entities.translation';
import {AddressDialogComponent, AddressDialogData} from './address-dialog.component';

const PAGE_SIZE = 10;

interface AddressRow {
  _id: string;
  address: EntityAddress;
  type: string;
  name: string;
  street: string;
  street2: string;
  postcode: string;
  city: string;
  countryName: string;
}

/** The Address tab: the customer's addresses, 10 to a page, sorted by the column clicked; add one, change one */
@Component({
  selector: 'app-address-entity',
  templateUrl: './address-entity.component.html',
  imports: [DataTableComponent, CellDefDirective, ButtonComponent, IconComponent, TooltipDirective, EntitiesTranslationPipe],
  providers: [EntitiesTranslationPipe],
})
export class AddressEntityComponent implements OnInit {
  private readonly entities = inject(EntitiesService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly dialog = inject(DialogService);
  private readonly i18n = inject(EntitiesTranslationPipe);
  private readonly entityId: string = inject(ActivatedRoute).snapshot.parent?.params['id'];
  private readonly countries = new Map(
    this.juicebox.getCountriesByLanguage(this.juicebox.getLanguage()).map(country => [country.code, country.name]),
  );

  protected readonly pageSize = PAGE_SIZE;
  protected readonly pageSizeOptions = [PAGE_SIZE];
  protected readonly page = signal(1);
  protected readonly sort = signal<SortState>({prop: '', dir: ''});
  private readonly addresses = signal<AddressRow[]>([]);
  protected readonly count = computed(() => this.addresses().length);
  protected readonly rows = computed(() => {
    const {prop, dir} = this.sort();
    const sorted = dir
      ? [...this.addresses()].sort((a, b) => String(a[prop as keyof AddressRow] ?? '')
        .localeCompare(String(b[prop as keyof AddressRow] ?? ''), undefined, {sensitivity: 'base'}) * (dir === 'asc' ? 1 : -1))
      : this.addresses();
    return sorted.slice((this.page() - 1) * PAGE_SIZE, this.page() * PAGE_SIZE);
  });

  protected readonly columns: ColumnConfig[] = [
    {key: 'type', label: this.i18n.transform('address_type'), sortable: true},
    {key: 'name', label: this.i18n.transform('name'), sortable: true},
    {key: 'street', label: this.i18n.transform('street'), sortable: true},
    {key: 'street2', label: `${this.i18n.transform('street')} 2`, sortable: true},
    {key: 'postcode', label: this.i18n.transform('postcode'), sortable: true},
    {key: 'city', label: this.i18n.transform('city'), sortable: true},
    {key: 'countryName', label: this.i18n.transform('country'), sortable: true},
    {key: 'actions', label: this.i18n.transform('actions'), width: '80px', align: 'right', ellipsis: false},
  ];

  ngOnInit(): void {
    this.juicebox.setActionButtons([{
      title: this.i18n.transform('add_address'),
      icon: 'add_location_alt',
      type: 'btn-primary',
      permissionsHide: 'entities:role#update',
      callback: () => this.openDialog({entityId: this.entityId}),
    }]);
    void this.load();
  }

  protected onPage(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
  }

  protected onSort(sort: SortState): void {
    this.sort.set(sort);
  }

  protected edit(row: AddressRow): void {
    // As in the old tab, neither a click outside nor Esc closes the edit dialog
    this.openDialog({entityId: this.entityId, address: row.address}, true);
  }

  /** The list is read again when the dialog closes, however it was closed */
  private openDialog(data: AddressDialogData, disableClose = false): void {
    this.dialog
      .open<AddressDialogComponent, AddressDialogData, boolean>(AddressDialogComponent, {data, disableClose, closeOnEscape: !disableClose})
      .closed.subscribe(() => void this.load());
  }

  private async load(): Promise<void> {
    const result = await this.entities.get(this.entityId);
    if (!result?.success || !result.payload) return;
    this.addresses.set((result.payload.addresses ?? []).map((address, index) => ({
      _id: address._id ?? String(index),
      address,
      type: address.type ? String(this.i18n.transform(address.type)) : '',
      name: address.name ?? '',
      street: address.street ?? '',
      street2: address.street2 ?? '',
      postcode: address.postcode ?? '',
      city: address.city ?? '',
      // The country's name in the admin's language, or what is stored where the list has no such code
      countryName: this.countries.get(address.country ?? '') ?? address.country ?? '',
    })));
    const lastPage = Math.max(Math.ceil(this.count() / PAGE_SIZE), 1);
    if (this.page() > lastPage) this.page.set(lastPage);
  }
}
