import {ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {CommonModule} from '@angular/common';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {ActivatedRoute} from "@angular/router";
import {CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';
import {ExportsService} from '../exports.service';
import {ExportsTranslationPipe} from '../i18n/exports.translation';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {ConfigurationService} from '../../../shared/services/configuration.service';
import {ExportTemplate} from '../types/ExportTemplate';
import {ExportStrategy} from '../types/ExportStrategy';
import {ExportColumn} from '../types/ExportColumn';
import {ExportFilter} from '../types/ExportFilter';
import {SharedModule} from '../../../shared/shared.module';
import {AutoLanguagePipe} from '../../../shared/pipes/auto-language.pipe';
import {ExportFiltersComponent} from '../components/export-filters/export-filters.component';

@Component({
    selector: 'app-export-template-edit',
    templateUrl: './export-template-edit.component.html',
    styleUrls: ['./export-template-edit.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        SharedModule,
        ReactiveFormsModule,
        DragDropModule,
        AutoLanguagePipe,
        ExportsTranslationPipe,
        ExportFiltersComponent,
    ]
})
export class ExportTemplateEditComponent {

    readonly templateForm = signal<FormGroup | null>(null);
    readonly dataSources = signal<Array<ExportStrategy>>([]);
    readonly columns = signal<Array<ExportColumn>>([]);
    readonly filters = signal<Array<ExportFilter>>([]);
    readonly filtersValid = signal(false);
    readonly selectedDataSource = signal<ExportStrategy | null>(null);
    readonly selectedColumns = signal<Array<ExportColumn>>([]);
    readonly sortable = signal<Array<ExportColumn>>([]);
    readonly promiseBtn = signal<Promise<any> | null>(null);
    readonly groupColumns = signal<Record<string, ExportColumn[]> | null>(null);
    readonly selectedGroupColumns = signal<Record<string, ExportColumn[]>>({});
    readonly groupColumnKeys = computed(() => {
        const gc = this.groupColumns();
        return gc ? Object.keys(gc) : [];
    });

    private readonly exportTemplateId = signal<string | null>(null);
    private exportTemplate: ExportTemplate;
    private readonly amgExport = signal(false);

    public juicebox = inject(JuiceboxService);
    private exports = inject(ExportsService);
    private route = inject(ActivatedRoute);
    private configurationService = inject(ConfigurationService);
    private i18n = inject(ExportsTranslationPipe);
    private destroyRef = inject(DestroyRef);

    constructor() {
        this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(async value => {
            this.exportTemplateId.set(value['id']);
            await this.init();
        });
    }

    private async init() {
        const amg_conf = await this.configurationService.getByKey('amgshop');
        this.amgExport.set(!!(amg_conf && amg_conf.success));

        const ready = await this.getData();
        if (!ready) return;

        this.juicebox.navigationEvent({
            location: this.i18n.transform('exports'),
            subject: this.exportTemplate.name,
            link: '/main/exports'
        });

        this.selectedColumns.set(this.columns().filter(column => this.exportTemplate.columns.includes(column.id)));
        this.sortable.set(this.selectedColumns().filter(column => column.sortable));
        this.columns.set(this.columns().filter(column => !this.selectedColumns().map(c => c.id).includes(column.id)));

        if (this.amgExport() && this.groupColumns()) {
            const newGroupColumns = {...this.groupColumns()};
            const newSelectedGroupColumns: Record<string, ExportColumn[]> = {};
            Object.keys(newGroupColumns).forEach(group => {
                newSelectedGroupColumns[group] = newGroupColumns[group].filter(column => this.exportTemplate.columns.includes(column.id));
                newGroupColumns[group] = newGroupColumns[group].filter(column => !newSelectedGroupColumns[group].map(c => c.id).includes(column.id));
            });
            this.groupColumns.set(newGroupColumns);
            this.selectedGroupColumns.set(newSelectedGroupColumns);
        }

        this.templateForm.set(new FormGroup({
            name: new FormControl(this.exportTemplate.name, Validators.required),
            data_source_key: new FormControl(this.exportTemplate.data_source_key, Validators.required),
            columns: new FormControl(this.exportTemplate.columns, Validators.required),
            filters: new FormControl(null),
            sort: new FormGroup({
                prop: new FormControl(this.exportTemplate.sort ? this.exportTemplate.sort.prop : null),
                dir: new FormControl(this.exportTemplate.sort ? this.exportTemplate.sort.dir : null),
            }),
            meta: new FormControl({
                user_id: this.juicebox.getUserId(),
                organisation_id: this.juicebox.getUserOrganisationId()
            })
        }));
    }

    private async getData() {
        await this.getExportTemplate();
        if (!this.exportTemplate) return false;

        await this.getDataSources();
        if (!this.dataSources().length) return false;

        await this.getColumns(this.exportTemplate.data_source_key);
        if (!this.columns()) return false;

        await this.getFilters(this.exportTemplate.data_source_key);

        return true;
    }

    private async getExportTemplate() {
        const id = this.exportTemplateId();
        if (!id) return;

        const result = await this.exports.getExportTemplate(id);
        if (!result) return;

        if (!result.success) {
            this.juicebox.showToast("error", result.error);
            return;
        }

        this.exportTemplate = result.payload;
    }

    private async getDataSources() {
        const result = await this.exports.getDataSourceStrategies();
        if (!result) return;

        if (!result.success) {
            this.juicebox.showToast("error", result.error);
            return;
        }

        this.dataSources.set(result.payload);
        this.selectedDataSource.set(this.dataSources().find(({key}) => this.exportTemplate.data_source_key === key) ?? null);
    }

    private async getColumns(datasourceStrategyKey: string) {
        const result = await this.exports.getColumns(datasourceStrategyKey);
        if (!result) return;
        if (!result.success) {
            this.juicebox.showToast("error", result.error);
            return;
        }

        const columns: any = result.payload;
        if (columns?.length && this.exportTemplate?.columns?.length) {
            columns.sort((col1, col2) => {
                return this.exportTemplate.columns.indexOf(col1.id) - this.exportTemplate.columns.indexOf(col2.id);
            });
        }

        if (this.amgExport()) {
            this.groupColumns.set(null);
            if (columns.some(column => column.group)) {
                const groupCols: Record<string, any[]> = {};
                columns.forEach(column => {
                    const group = column.group || 'Ungrouped';
                    if (!groupCols[group]) groupCols[group] = [];
                    groupCols[group].push(column);
                });
                this.groupColumns.set(groupCols);
                this.selectedGroupColumns.set(
                    Object.fromEntries(Object.keys(groupCols).map(group => [group, []]))
                );
            }
        }

        this.columns.set(columns);
        this.selectedColumns.set([]);
        this.sortable.set([]);
    }

    private async getFilters(datasourceStrategyKey: string) {
        const result = await this.exports.getFilters(datasourceStrategyKey);
        if (!result) return;
        if (!result.success) {
            this.juicebox.showToast("error", result.error);
            return;
        }

        const amg_conf = await this.configurationService.getByKey('amgshop');
        if (amg_conf && amg_conf.success) {
            for (const filter of result.payload) {
                if (filter.id === 'category') {
                    (<any>filter).items = await this.juicebox.pleaseExtendYourServiceDontDoThis().request("booking-service", "getExportCategories", []);
                }
            }
        }

        this.filters.set(result.payload.map(filter => {
            const _filter: {id, value} = this.exportTemplate.filters.find(_filter => _filter.id === filter.id);
            return {...filter, value: _filter ? _filter.value : null};
        }));
    }

    save() {
        const form = this.templateForm();
        form.markAllAsTouched();
        if (form.invalid) return;

        this.promiseBtn.set((async () => {
            const result = await this.exports.editExportTemplate(this.exportTemplateId(), form.value);
            if (!result) return;
            if (result.success) {
                this.juicebox.showToast("success", this.i18n.transform('template_saved'));
            } else {
                this.juicebox.showToast("error", this.i18n.transform(result.error));
            }
        })());
    }

    async onDataSourceChange(key: string) {
        this.selectedDataSource.set(this.dataSources().find(ds => ds.key === key) ?? null);
        const form = this.templateForm();
        form.controls["columns"].reset();
        form.controls["filters"].reset();
        form.controls["sort"].reset();
        await this.getColumns(key);
        await this.getFilters(key);
    }

    selectDataSource(key: string) {
        const form = this.templateForm();
        form.get('data_source_key')?.setValue(key);
        this.onDataSourceChange(key);
    }

    onColumnSelected() {
        const form = this.templateForm();
        form.get('columns').patchValue(this.selectedColumns().length ? this.selectedColumns().map(c => c.id) : null);
        this.sortable.set(this.selectedColumns().filter(column => column.sortable));
        if (!this.sortable().find(column => column.id === form.value?.sort?.prop)) {
            form.get('sort').reset();
        }
        this.updateSortControlsState();
    }

    selectAllColumns() {
        this.selectedColumns.set([...this.selectedColumns(), ...this.columns()]);
        this.columns.set([]);
        const form = this.templateForm();
        form.get('columns').patchValue(this.selectedColumns().length ? this.selectedColumns().map(c => c.id) : null);
        this.sortable.set(this.selectedColumns().filter(column => column.sortable));
        this.updateSortControlsState();
    }

    deSelectAllColumns() {
        this.columns.set([...this.selectedColumns(), ...this.columns()]);
        this.selectedColumns.set([]);
        const form = this.templateForm();
        form.get('columns').patchValue(this.selectedColumns().length ? this.selectedColumns().map(c => c.id) : null);
        this.sortable.set(this.selectedColumns().filter(column => column.sortable));
        this.updateSortControlsState();
    }

    onGroupColumnSelected() {
        const selected: ExportColumn[] = [];
        const sgc = this.selectedGroupColumns();
        Object.keys(sgc).forEach(group => {
            for (const column of sgc[group]) selected.push(column);
        });
        this.selectedColumns.set(selected);
        const form = this.templateForm();
        form.get('columns').patchValue(this.selectedColumns().length ? this.selectedColumns().map(c => c.id) : null);
        this.sortable.set(this.selectedColumns().filter(column => column.sortable));
        if (!this.sortable().find(column => column.id === form.value?.sort?.prop)) {
            form.get('sort').reset();
        }
        this.updateSortControlsState();
    }

    selectAllGroupColumns(group: string) {
        const newGroupSelected = [...this.selectedGroupColumns()[group], ...this.groupColumns()[group]];
        this.selectedGroupColumns.update(prev => ({...prev, [group]: newGroupSelected}));
        this.selectedColumns.set([...this.selectedColumns(), ...newGroupSelected]);
        this.groupColumns.update(prev => ({...prev, [group]: []}));
        this.columns.set([]);
        this.templateForm().get('columns').patchValue(this.selectedColumns().length ? this.selectedColumns().map(c => c.id) : null);
        this.sortable.set(newGroupSelected.filter(column => column.sortable));
    }

    deSelectAllGroupColumns(group: string) {
        const toDeselect = this.selectedGroupColumns()[group];
        this.groupColumns.update(prev => ({...prev, [group]: [...toDeselect, ...prev[group]]}));
        this.selectedColumns.set(this.selectedColumns().filter(column => !toDeselect.includes(column)));
        this.selectedGroupColumns.update(prev => ({...prev, [group]: []}));
        const form = this.templateForm();
        form.get('columns').patchValue(this.selectedColumns().length ? this.selectedColumns().map(c => c.id) : null);
        this.sortable.set(this.selectedColumns().filter(column => column.sortable));
    }

    onSortField(event: unknown) {
        const form = this.templateForm();
        if (event) {
            form.get(['sort', 'dir']).patchValue('desc');
        } else {
            form.get(['sort', 'dir']).patchValue(null);
        }
        this.updateSortControlsState();
    }

    onFiltersValueChange(filterForm: FormGroup) {
        this.filtersValid.set(filterForm.valid);
        this.templateForm().get('filters').patchValue(filterForm.value);
    }

    onColumnDrop(event: CdkDragDrop<ExportColumn[]>) {
        if (event.previousContainer === event.container) {
            if (event.container.data === this.selectedColumns()) {
                const arr = [...this.selectedColumns()];
                moveItemInArray(arr, event.previousIndex, event.currentIndex);
                this.selectedColumns.set(arr);
            } else {
                const arr = [...this.columns()];
                moveItemInArray(arr, event.previousIndex, event.currentIndex);
                this.columns.set(arr);
            }
        } else {
            const fromSelected = event.previousContainer.data === this.selectedColumns();
            const src = fromSelected ? [...this.selectedColumns()] : [...this.columns()];
            const dst = fromSelected ? [...this.columns()] : [...this.selectedColumns()];
            transferArrayItem(src, dst, event.previousIndex, event.currentIndex);
            if (fromSelected) {
                this.selectedColumns.set(src);
                this.columns.set(dst);
            } else {
                this.columns.set(src);
                this.selectedColumns.set(dst);
            }
            this.onColumnSelected();
        }
    }

    onGroupColumnDrop(event: CdkDragDrop<ExportColumn[]>, group: string) {
        const gc = this.groupColumns();
        const sgc = this.selectedGroupColumns();
        if (event.previousContainer === event.container) {
            if (event.container.data === gc[group]) {
                const arr = [...gc[group]];
                moveItemInArray(arr, event.previousIndex, event.currentIndex);
                this.groupColumns.update(prev => ({...prev, [group]: arr}));
            } else {
                const arr = [...sgc[group]];
                moveItemInArray(arr, event.previousIndex, event.currentIndex);
                this.selectedGroupColumns.update(prev => ({...prev, [group]: arr}));
            }
        } else {
            const fromAvailable = event.previousContainer.data === gc[group];
            const src = fromAvailable ? [...gc[group]] : [...sgc[group]];
            const dst = fromAvailable ? [...sgc[group]] : [...gc[group]];
            transferArrayItem(src, dst, event.previousIndex, event.currentIndex);
            if (fromAvailable) {
                this.groupColumns.update(prev => ({...prev, [group]: src}));
                this.selectedGroupColumns.update(prev => ({...prev, [group]: dst}));
            } else {
                this.selectedGroupColumns.update(prev => ({...prev, [group]: src}));
                this.groupColumns.update(prev => ({...prev, [group]: dst}));
            }
            this.onGroupColumnSelected();
        }
    }

    updateSortControlsState() {
        const form = this.templateForm();
        const sortPropControl = form.get(['sort', 'prop']);
        const sortDirControl = form.get(['sort', 'dir']);

        if (this.selectedColumns().length === 0 || this.sortable().length === 0) {
            sortPropControl?.disable();
            sortDirControl?.disable();
        } else {
            sortPropControl?.enable();
            if (form.value?.sort?.prop) {
                sortDirControl?.enable();
            } else {
                sortDirControl?.disable();
            }
        }
    }
}
