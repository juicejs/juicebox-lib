import {Component, computed, inject, input, OnInit, output, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';
import {SHARED_IMPORTS} from '../../../shared/shared-imports';
import {AutoLanguagePipe} from '../../../shared/pipes/auto-language.pipe';
import {ConfigurationService} from '../../../shared/services/configuration.service';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {ExportFiltersComponent} from '../components/export-filters/export-filters.component';
import {exportFilterValues} from '../components/export-filters/export-filter-values';
import {ExportsService} from '../exports.service';
import {ExportsTranslationPipe} from '../i18n/exports.translation';
import {ExportColumn} from '../types/ExportColumn';
import {ExportFilter, FilterOptions} from '../types/ExportFilter';
import {ExportStrategy} from '../types/ExportStrategy';
import {ExportTemplate, ExportTemplateFormValue} from '../types/ExportTemplate';

type ColumnGroups = Record<string, ExportColumn[]>;

/**
 * An export template's name, data source, columns (picked by dragging, in groups for AMG), sort and filters, for
 * creating one or editing `template`. It sends what the old create and edit pages sent; the page stores it.
 */
@Component({
  selector: 'app-export-template-editor',
  templateUrl: './export-template-editor.component.html',
  styleUrl: './export-template-editor.component.scss',
  imports: [SHARED_IMPORTS, ReactiveFormsModule, DragDropModule, AutoLanguagePipe, ExportsTranslationPipe, ExportFiltersComponent],
})
export class ExportTemplateEditorComponent implements OnInit {
  /** The template being edited; without one a new template is made */
  readonly template = input<ExportTemplate | null>(null);
  readonly submitLabel = input.required<string>();
  /** The user may store it (data-export:role#create or #update) */
  readonly canSubmit = input(false);
  /** The page's store request, for the button's spinner */
  readonly busy = input<Promise<unknown> | null>(null);
  readonly submitted = output<ExportTemplateFormValue>();

  private readonly exports = inject(ExportsService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly configuration = inject(ConfigurationService);
  private readonly i18n = inject(ExportsTranslationPipe);

  protected readonly templateForm = signal<FormGroup | null>(null);
  protected readonly dataSources = signal<ExportStrategy[]>([]);
  protected readonly selectedDataSource = signal<ExportStrategy | null>(null);
  /** The columns that can still be picked; the picked ones are in `selectedColumns`, in their order */
  protected readonly columns = signal<ExportColumn[]>([]);
  protected readonly selectedColumns = signal<ExportColumn[]>([]);
  protected readonly sortable = computed(() => this.selectedColumns().filter(column => column.sortable));
  /** AMG (the `amgshop` configuration) picks grouped columns per group */
  protected readonly groupColumns = signal<ColumnGroups | null>(null);
  protected readonly selectedGroupColumns = signal<ColumnGroups>({});
  protected readonly groupColumnKeys = computed(() => Object.keys(this.groupColumns() ?? {}));
  protected readonly filters = signal<ExportFilter[]>([]);
  protected readonly filtersValid = signal(false);
  private amgExport = false;

  async ngOnInit(): Promise<void> {
    const template = this.template();
    const amg = await this.configuration.getByKey('amgshop');
    this.amgExport = !!amg?.success;
    if (!await this.loadDataSources(!template)) return;

    if (template) {
      this.selectedDataSource.set(this.dataSources().find(source => source.key === template.data_source_key) ?? null);
      await Promise.all([this.loadColumns(template.data_source_key), this.loadFilters(template.data_source_key)]);
      this.restoreSelection(template.columns);
    }

    this.templateForm.set(new FormGroup({
      name: new FormControl(template?.name ?? null, Validators.required),
      data_source_key: new FormControl(template?.data_source_key ?? null, Validators.required),
      columns: new FormControl(template?.columns ?? null, Validators.required),
      filters: new FormControl(null),
      sort: new FormGroup({
        prop: new FormControl(template?.sort?.prop ?? null),
        dir: new FormControl(template?.sort?.dir ?? null),
      }),
      meta: new FormControl({
        user_id: this.juicebox.getUserId(),
        organisation_id: this.juicebox.getUserOrganisationId(),
      }),
    }));
    this.updateSortControlsState();
  }

  protected submit(): void {
    const form = this.templateForm();
    if (!form) return;
    form.markAllAsTouched();
    // The sort fields are disabled while there is nothing to sort by; they are sent anyway, as the old pages did
    if (form.invalid) return;
    this.submitted.emit(form.getRawValue());
  }

  protected async selectDataSource(source: ExportStrategy): Promise<void> {
    const form = this.templateForm();
    if (!form) return;
    this.selectedDataSource.set(source);
    form.controls['data_source_key'].setValue(source.key);
    form.controls['columns'].reset();
    form.controls['filters'].reset();
    form.controls['sort'].reset();
    await Promise.all([this.loadColumns(source.key), this.loadFilters(source.key)]);
    // A new invoice template takes all columns, as the old create page did
    if (!this.template() && source.key === 'invoice:strategy') this.selectAllColumns();
    this.updateSortControlsState();
  }

  protected selectAllColumns(): void {
    this.setSelection([...this.selectedColumns(), ...this.columns()]);
    this.columns.set([]);
  }

  protected deselectAllColumns(): void {
    this.columns.set([...this.selectedColumns(), ...this.columns()]);
    this.setSelection([]);
  }

  /** The keyboard's way to move a column to the other list; the mouse drags it */
  protected toggleColumn(column: ExportColumn, selected: boolean): void {
    if (selected) {
      this.columns.update(columns => [...columns, column]);
      this.setSelection(this.selectedColumns().filter(other => other !== column));
    } else {
      this.columns.update(columns => columns.filter(other => other !== column));
      this.setSelection([...this.selectedColumns(), column]);
    }
  }

  protected onColumnDrop(event: CdkDragDrop<ExportColumn[]>): void {
    const available = [...this.columns()];
    const selected = [...this.selectedColumns()];
    const lists = (data: ExportColumn[]) => (data === this.selectedColumns() ? selected : available);
    if (event.previousContainer === event.container) {
      moveItemInArray(lists(event.container.data), event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(lists(event.previousContainer.data), lists(event.container.data), event.previousIndex, event.currentIndex);
    }
    this.columns.set(available);
    this.setSelection(selected);
  }

  protected selectAllGroupColumns(group: string): void {
    const groups = this.groupColumns();
    if (!groups) return;
    this.selectedGroupColumns.update(selected => ({...selected, [group]: [...(selected[group] ?? []), ...groups[group]]}));
    this.groupColumns.update(available => ({...available, [group]: []}));
    this.syncGroupSelection();
  }

  protected deselectAllGroupColumns(group: string): void {
    const selected = this.selectedGroupColumns()[group] ?? [];
    this.groupColumns.update(available => ({...available, [group]: [...selected, ...(available?.[group] ?? [])]}));
    this.selectedGroupColumns.update(groups => ({...groups, [group]: []}));
    this.syncGroupSelection();
  }

  protected toggleGroupColumn(group: string, column: ExportColumn, selected: boolean): void {
    const without = (columns: ExportColumn[] = []) => columns.filter(other => other !== column);
    if (selected) {
      this.selectedGroupColumns.update(groups => ({...groups, [group]: without(groups[group])}));
      this.groupColumns.update(groups => ({...groups, [group]: [...(groups?.[group] ?? []), column]}));
    } else {
      this.groupColumns.update(groups => ({...groups, [group]: without(groups?.[group])}));
      this.selectedGroupColumns.update(groups => ({...groups, [group]: [...(groups[group] ?? []), column]}));
    }
    this.syncGroupSelection();
  }

  protected onGroupColumnDrop(event: CdkDragDrop<ExportColumn[]>, group: string): void {
    const available = [...(this.groupColumns()?.[group] ?? [])];
    const selected = [...(this.selectedGroupColumns()[group] ?? [])];
    const lists = (data: ExportColumn[]) => (data === this.selectedGroupColumns()[group] ? selected : available);
    if (event.previousContainer === event.container) {
      moveItemInArray(lists(event.container.data), event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(lists(event.previousContainer.data), lists(event.container.data), event.previousIndex, event.currentIndex);
    }
    this.groupColumns.update(groups => ({...groups, [group]: available}));
    this.selectedGroupColumns.update(groups => ({...groups, [group]: selected}));
    this.syncGroupSelection();
  }

  /** A sort column gets a descending direction, as in the old pages; without one there is no direction */
  protected onSortField(prop: unknown): void {
    this.templateForm()?.get(['sort', 'dir'])?.setValue(prop ? 'desc' : null);
    this.updateSortControlsState();
  }

  protected onFiltersValueChange(filterForm: FormGroup): void {
    this.filtersValid.set(filterForm.valid);
    this.templateForm()?.get('filters')?.setValue(exportFilterValues(filterForm));
  }

  /** The new template's data sources skip vendors, except for the master organisation, as in the old create page */
  private async loadDataSources(creating: boolean): Promise<boolean> {
    const result = await this.exports.getDataSourceStrategies();
    if (!result) return false;
    if (!result.success) {
      this.juicebox.showToast('error', this.i18n.transform(result.error));
      return false;
    }
    let sources = result.payload ?? [];
    if (creating) {
      const master = await this.configuration.getByKey('juice:master-organisation');
      const isMaster = master?.payload?.value == this.juicebox.getUserOrganisationId();
      sources = sources.filter(source => isMaster || source.key !== 'vendors:strategy');
    }
    this.dataSources.set(sources);
    return true;
  }

  /** The data source's columns, the edited template's first in its order; nothing is picked yet */
  private async loadColumns(dataSourceKey: string): Promise<void> {
    this.columns.set([]);
    this.selectedColumns.set([]);
    this.groupColumns.set(null);
    this.selectedGroupColumns.set({});
    const result = await this.exports.getColumns(dataSourceKey);
    if (!result) return;
    if (!result.success) {
      this.juicebox.showToast('error', result.error ?? '');
      return;
    }
    const order = this.template()?.columns ?? [];
    const columns = [...(result.payload ?? [])]
      .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    this.columns.set(columns);
    if (this.amgExport && columns.some(column => column.group)) {
      const groups: ColumnGroups = {};
      for (const column of columns) (groups[column.group || 'Ungrouped'] ??= []).push(column);
      this.groupColumns.set(groups);
      this.selectedGroupColumns.set(Object.fromEntries(Object.keys(groups).map(group => [group, []])));
    }
  }

  /** The data source's filters with the edited template's values; AMG's category filter lists the booking categories */
  private async loadFilters(dataSourceKey: string): Promise<void> {
    const result = await this.exports.getFilters(dataSourceKey);
    if (!result) return;
    if (!result.success) {
      this.juicebox.showToast('error', result.error ?? '');
      return;
    }
    const filters = result.payload ?? [];
    if (this.amgExport) {
      for (const filter of filters) {
        if (filter.id !== 'category') continue;
        const categories: FilterOptions[] | {payload?: FilterOptions[]} = await this.juicebox
          .pleaseExtendYourServiceDontDoThis().request('booking-service', 'getExportCategories', []);
        // The old edit page put the whole answer here; the options are its payload when it is a Result
        filter.items = Array.isArray(categories) ? categories : (categories?.payload ?? []);
      }
    }
    const saved = this.template()?.filters ?? [];
    this.filters.set(filters.map(filter => ({...filter, value: saved.find(value => value.id === filter.id)?.value ?? null})));
  }

  /** The edited template's columns become the picked ones, in its order */
  private restoreSelection(columnIds: string[]): void {
    const picked = (column: ExportColumn) => columnIds.includes(column.id);
    this.selectedColumns.set(this.columns().filter(picked));
    this.columns.update(columns => columns.filter(column => !picked(column)));
    const groups = this.groupColumns();
    if (!groups) return;
    this.selectedGroupColumns.set(Object.fromEntries(Object.entries(groups).map(([group, columns]) => [group, columns.filter(picked)])));
    this.groupColumns.set(Object.fromEntries(Object.entries(groups).map(([group, columns]) => [group, columns.filter(column => !picked(column))])));
  }

  /** The groups' picked columns, group by group, are the template's columns */
  private syncGroupSelection(): void {
    this.setSelection(Object.values(this.selectedGroupColumns()).flat());
  }

  private setSelection(selected: ExportColumn[]): void {
    this.selectedColumns.set(selected);
    const form = this.templateForm();
    if (!form) return;
    form.get('columns')?.setValue(selected.length ? selected.map(column => column.id) : null);
    if (!this.sortable().some(column => column.id === form.getRawValue().sort?.prop)) form.get('sort')?.reset();
    this.updateSortControlsState();
  }

  /** As the old readonly sort selects: no sort column without sortable columns, no direction without a sort column */
  private updateSortControlsState(): void {
    const form = this.templateForm();
    if (!form) return;
    const prop = form.get(['sort', 'prop']);
    const dir = form.get(['sort', 'dir']);
    if (!this.selectedColumns().length || !this.sortable().length) {
      prop?.disable({emitEvent: false});
      dir?.disable({emitEvent: false});
    } else {
      prop?.enable({emitEvent: false});
      if (form.getRawValue().sort?.prop) dir?.enable({emitEvent: false});
      else dir?.disable({emitEvent: false});
    }
  }
}
