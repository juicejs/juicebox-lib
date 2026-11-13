import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {
  ButtonComponent,
  CellDefDirective,
  ColumnConfig,
  DataTableComponent,
  DialogService,
  FormFieldComponent,
  IconComponent,
  InputDirective,
  PageEvent,
  SortState,
  TooltipDirective,
} from '../../../../ui-components';
import {ConfirmationDialogComponent, ConfirmationDialogData} from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import {DebounceKeyupDirective} from '../../../shared/directives/debounce/debounce-keyup.directive';
import {ConfigurationService} from '../../../shared/services/configuration.service';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {ComparedConfiguration} from '../../../shared/types/ComparedConfiguration';
import {Configuration} from '../../../shared/types/Configuration';
import {ConfigurationsCreateDialogComponent} from '../create/configurations-create-dialog.component';
import {ConfigurationsEditDialogComponent, ConfigurationsEditDialogData} from '../edit/configurations-edit-dialog.component';
import {ConfigurationsTranslationPipe} from '../i18n/configurations.translation';

const PAGE_SIZE = 100;
/** The old juicebox's dialogs were Bootstrap's large ones */
const DIALOG_WIDTH = '800px';

/** One key of the list: its memory copy and its database copy */
interface ConfigurationRow {
  compared: ComparedConfiguration;
  /** The memory copy, else the database copy: what the filter and the sort read */
  configuration: Configuration;
  /** As shown: the memory copy's, else the database copy's after "[DB]" */
  name: string;
  key: string;
  schema: string;
  inMemory: boolean;
  inDatabase: boolean;
  equal: boolean;
}

type SortColumn = 'name' | 'key' | 'schema' | 'inMemory' | 'inDatabase' | 'equal';

/**
 * The backend's configurations, in memory and in the database, all read at once: filtered, sorted and paged here, as
 * the old juicebox's table did. Add new and the edit button open dialogs; after any dialog, and after the delete
 * question, the list is read again.
 */
@Component({
  selector: 'app-configurations-listing',
  templateUrl: './configurations-listing.component.html',
  styleUrl: './configurations-listing.component.scss',
  imports: [
    DataTableComponent,
    CellDefDirective,
    ButtonComponent,
    IconComponent,
    TooltipDirective,
    FormFieldComponent,
    InputDirective,
    DebounceKeyupDirective,
    ConfigurationsTranslationPipe,
  ],
  providers: [ConfigurationsTranslationPipe],
})
export class ConfigurationsListingComponent implements OnInit {
  private readonly configurations = inject(ConfigurationService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly dialog = inject(DialogService);
  private readonly i18n = inject(ConfigurationsTranslationPipe);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly pageSizeOptions = [PAGE_SIZE];
  protected readonly filterPlaceholder =
    `${this.i18n.transform('type_to_filter_columns')}: ${this.i18n.transform('name')}, ${this.i18n.transform('key')}, ${this.i18n.transform('schema')}...`;

  private readonly all = signal<ConfigurationRow[]>([]);
  /** Applied half a second after typing pauses */
  private readonly filter = signal('');
  protected readonly sort = signal<SortState>({prop: 'key', dir: 'asc'});
  /** 0-based */
  protected readonly page = signal(0);
  /** Counts the readings, so a slower older answer can't replace a newer one */
  private request = 0;

  private readonly shown = computed(() => {
    const filter = this.filter().toLowerCase();
    const rows = filter
      ? this.all().filter(row => (['name', 'schema', 'key'] as const).some(field => text(row.configuration[field]).toLowerCase().includes(filter)))
      : this.all();
    const {prop, dir} = this.sort();
    if (!dir) return rows;
    const direction = dir === 'desc' ? -1 : 1;
    return [...rows].sort((left, right) => direction * compare(sortValue(left, prop as SortColumn), sortValue(right, prop as SortColumn)));
  });
  protected readonly count = computed(() => this.shown().length);
  protected readonly rows = computed(() => this.shown().slice(this.page() * PAGE_SIZE, (this.page() + 1) * PAGE_SIZE));

  protected readonly columns: ColumnConfig[] = [
    {key: 'name', label: this.i18n.transform('name'), sortable: true},
    {key: 'key', label: this.i18n.transform('key'), sortable: true},
    {key: 'schema', label: this.i18n.transform('schema'), sortable: true},
    {key: 'inMemory', label: this.i18n.transform('in_memory'), sortable: true, width: '128px', align: 'center', ellipsis: false},
    {key: 'inDatabase', label: this.i18n.transform('in_database'), sortable: true, width: '128px', align: 'center', ellipsis: false},
    {key: 'equal', label: this.i18n.transform('equal'), sortable: true, width: '104px', align: 'center', ellipsis: false},
    {key: 'actions', label: this.i18n.transform('actions'), width: '112px', align: 'right', ellipsis: false},
  ];

  async ngOnInit(): Promise<void> {
    this.juicebox.navigationEvent({
      location: this.i18n.transform('configurations'),
      subject: this.i18n.transform('configuration_list'),
      link: '/main/configuration',
    });
    this.juicebox.setActionButtons([{
      title: this.i18n.transform('add_new'),
      type: 'btn-primary',
      icon: 'add',
      callback: () => this.create(),
    }]);
    await this.fetch();
  }

  protected onFilter(value: string): void {
    this.filter.set(value);
    this.page.set(0);
  }

  protected onSort(sort: SortState): void {
    this.sort.set(sort);
    this.page.set(0);
  }

  protected onPage(event: PageEvent): void {
    this.page.set(event.pageIndex);
  }

  protected edit(row: ConfigurationRow): void {
    const {memory, database} = row.compared.configurations;
    const data: ConfigurationsEditDialogData = {configurationKey: memory?.key || database?.key || null};
    this.dialog
      .open<ConfigurationsEditDialogComponent, ConfigurationsEditDialogData, boolean>(ConfigurationsEditDialogComponent, {
        data,
        disableClose: true,
        width: DIALOG_WIDTH,
      })
      .closed.subscribe(() => void this.fetch());
  }

  /** Asks first; answered either way, the list is read again */
  protected remove(row: ConfigurationRow): void {
    const {memory, database} = row.compared.configurations;
    const name = memory?.name || database?.name || row.configuration.key;
    const data: ConfirmationDialogData = {
      action: this.i18n.transform('delete'),
      completeMessage: `${this.i18n.transform('are_you_sure_you_want_to_delete_configuration')}: ${name}`,
      destructive: true,
    };
    this.dialog
      .open<ConfirmationDialogComponent, ConfirmationDialogData, boolean>(ConfirmationDialogComponent, {data, disableClose: true})
      .closed.subscribe(async confirmed => {
        if (confirmed) {
          const result = await this.configurations.delete(memory?.key || database?.key || null);
          // No answer at all: the gateway has already said what went wrong
          if (result && !result.success) this.juicebox.showToast('error', result.error);
          else if (result) this.juicebox.showToast('success', this.i18n.transform('configuration_deleted'));
        }
        await this.fetch();
      });
  }

  private create(): void {
    this.dialog
      .open<ConfigurationsCreateDialogComponent, undefined, boolean>(ConfigurationsCreateDialogComponent, {
        disableClose: true,
        width: DIALOG_WIDTH,
      })
      .closed.subscribe(() => void this.fetch());
  }

  private async fetch(): Promise<void> {
    const request = ++this.request;
    const result = await this.configurations.fetch();
    if (request !== this.request || !result?.success) return;
    this.all.set((result.payload ?? []).map(toRow));
    // Fewer rows than before: stay on the last page there is
    const lastPage = Math.max(Math.ceil(this.count() / PAGE_SIZE) - 1, 0);
    if (this.page() > lastPage) this.page.set(lastPage);
  }
}

function toRow(compared: ComparedConfiguration): ConfigurationRow {
  const {memory, database} = compared.configurations;
  const shown = (field: 'name' | 'key' | 'schema'): string => (memory ? text(memory[field]) : `[DB]${text(database?.[field])}`);
  return {
    compared,
    configuration: memory ?? database,
    name: shown('name'),
    key: shown('key'),
    schema: shown('schema'),
    inMemory: !!memory,
    inDatabase: !!database,
    equal: compared.comparison?.equal === true,
  };
}

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

/** Name, key and schema sort as the copy has them, without "[DB]"; the other columns as yes after no */
function sortValue(row: ConfigurationRow, column: SortColumn): string | boolean {
  switch (column) {
    case 'name':
    case 'key':
    case 'schema':
      return text(row.configuration?.[column]).toLowerCase();
    default:
      return row[column];
  }
}

function compare(left: string | boolean, right: string | boolean): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
