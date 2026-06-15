import {ChangeDetectionStrategy, Component, computed, inject, OnInit, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';
import {ExportColumn} from '../types/ExportColumn';
import {ExportStrategy} from '../types/ExportStrategy';
import {ExportFilter} from '../types/ExportFilter';
import {ExportsTranslationPipe} from '../i18n/exports.translation';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {ExportsService} from '../exports.service';
import {ConfigurationService} from '../../../shared/services/configuration.service';
import {AutoLanguagePipe} from '../../../shared/pipes/auto-language.pipe';
import {SharedModule} from '../../../shared/shared.module';
import {ExportFiltersComponent} from '../components/export-filters/export-filters.component';

@Component({
    selector: 'app-export-template-create',
    templateUrl: './export-template-create.component.html',
    styleUrls: ['./export-template-create.component.scss'],
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
export class ExportTemplateCreateComponent implements OnInit {

    amgExport = false;

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

public juicebox = inject(JuiceboxService);
    private exports = inject(ExportsService);
    private router = inject(Router);
    private configurationService = inject(ConfigurationService);
    private i18n = inject(ExportsTranslationPipe);

    async ngOnInit() {
        this.juicebox.navigationEvent({
            location: this.i18n.transform('exports'),
            subject: this.i18n.transform('create_export_template'),
            link: '/main/exports'
        });

        const amg_conf = await this.configurationService.getByKey('amgshop');
        if (amg_conf && amg_conf.success) {
            this.amgExport = true;
        }

        await this.getDataSources();

        this.templateForm.set(new FormGroup({
            name: new FormControl(null, Validators.required),
            data_source_key: new FormControl(null, Validators.required),
            columns: new FormControl(null, Validators.required),
            filters: new FormControl(null),
            sort: new FormGroup({
                prop: new FormControl(null),
                dir: new FormControl(null)
            }),
            meta: new FormControl({
                user_id: this.juicebox.getUserId(),
                organisation_id: this.juicebox.getUserOrganisationId()
            })
        }));

        this.updateSortControlsState();
    }

    private async getDataSources() {
        const result = await this.exports.getDataSourceStrategies();
        if (!result) return;
        if (!result.success) {
            this.juicebox.showToast('error', this.i18n.transform(result.error));
            return;
        }

        const masterOrgConf = await this.configurationService.getByKey('juice:master-organisation');
        const isMaster = masterOrgConf?.payload?.value == this.juicebox.getUserOrganisationId();
        const sources = (result.payload as ExportStrategy[])
            .filter(source => isMaster || source.key !== 'vendors:strategy');
        this.dataSources.set(sources);
    }

    private async getColumns(datasourceStrategyKey: string) {
        const result = await this.exports.getColumns(datasourceStrategyKey);
        if (!result) return;
        if (!result.success) {
            this.juicebox.showToast('error', result.error as string);
            return;
        }

        const cols: ExportColumn[] = result.payload || [];

        if (this.amgExport) {
            this.groupColumns.set(null);
            if (cols.some(column => column.group)) {
                const grouped: Record<string, ExportColumn[]> = {};
                cols.forEach(column => {
                    const group = column.group || 'Ungrouped';
                    if (!grouped[group]) grouped[group] = [];
                    grouped[group].push(column);
                });
                this.groupColumns.set(grouped);
                this.selectedGroupColumns.set(
                    Object.fromEntries(Object.keys(grouped).map(group => [group, []]))
                );
            }
        }

        this.columns.set(cols);
        this.selectedColumns.set([]);
        this.sortable.set([]);

        if (datasourceStrategyKey === 'invoice:strategy') {
            this.selectAllColumns();
        }
    }

    private async getFilters(datasourceStrategyKey: string) {
        const result = await this.exports.getFilters(datasourceStrategyKey);
        if (!result) return;
        if (!result.success) {
            this.juicebox.showToast('error', result.error as string);
            return;
        }
        this.filters.set(result.payload);
    }

    create() {
        const form = this.templateForm();
        form.markAllAsTouched();
        if (form.invalid) return;

        this.promiseBtn.set((async () => {
            const result = await this.exports.createExportTemplate(form.value);
            if (!result) return;
            if (result.success) {
                this.juicebox.showToast('success', this.i18n.transform('export_template_created'));
                if (form.value.data_source_key === 'sap-data:strategy') {
                    this.juicebox.showToast('warning', this.i18n.transform('sap_export_create_admin'));
                }
                await this.router.navigateByUrl('/main/exports');
            } else {
                this.juicebox.showToast('error', this.i18n.transform(result.error));
            }
        })());
    }

    async onDataSourceChange(key: string) {
        this.selectedDataSource.set(this.dataSources().find(ds => ds.key === key) ?? null);
        const form = this.templateForm();
        form.controls['columns'].reset();
        form.controls['filters'].reset();
        form.controls['sort'].reset();
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
        form.get('columns')?.patchValue(this.selectedColumns().length ? this.selectedColumns().map(c => c.id) : null);
        this.sortable.set(this.selectedColumns().filter(column => column.sortable));
        if (!this.sortable().find(column => column.id === form.value?.sort?.prop)) {
            form.get('sort')?.reset();
        }
        this.updateSortControlsState();
    }

    selectAllColumns() {
        this.selectedColumns.set([...this.selectedColumns(), ...this.columns()]);
        this.columns.set([]);
        const form = this.templateForm();
        form.get('columns')?.patchValue(this.selectedColumns().length ? this.selectedColumns().map(c => c.id) : null);
        this.sortable.set(this.selectedColumns().filter(column => column.sortable));
        this.updateSortControlsState();
    }

    deSelectAllColumns() {
        this.columns.set([...this.selectedColumns(), ...this.columns()]);
        this.selectedColumns.set([]);
        const form = this.templateForm();
        form.get('columns')?.patchValue(this.selectedColumns().length ? this.selectedColumns().map(c => c.id) : null);
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
        form.get('columns')?.patchValue(this.selectedColumns().length ? this.selectedColumns().map(c => c.id) : null);
        this.sortable.set(this.selectedColumns().filter(column => column.sortable));
        if (!this.sortable().find(column => column.id === form.value?.sort?.prop)) {
            form.get('sort')?.reset();
        }
        this.updateSortControlsState();
    }

    selectAllGroupColumns(group: string) {
        const newGroupSelected = [...this.selectedGroupColumns()[group], ...this.groupColumns()[group]];
        this.selectedGroupColumns.update(prev => ({...prev, [group]: newGroupSelected}));
        this.selectedColumns.set([...this.selectedColumns(), ...newGroupSelected]);
        this.groupColumns.update(prev => ({...prev, [group]: []}));
        this.columns.set([]);
        this.templateForm().get('columns')?.patchValue(this.selectedColumns().length ? this.selectedColumns().map(c => c.id) : null);
        this.sortable.set(newGroupSelected.filter(column => column.sortable));
    }

    deSelectAllGroupColumns(group: string) {
        const toDeselect = this.selectedGroupColumns()[group];
        this.groupColumns.update(prev => ({...prev, [group]: [...toDeselect, ...prev[group]]}));
        this.selectedColumns.set(this.selectedColumns().filter(column => !toDeselect.includes(column)));
        this.selectedGroupColumns.update(prev => ({...prev, [group]: []}));
        const form = this.templateForm();
        form.get('columns')?.patchValue(this.selectedColumns().length ? this.selectedColumns().map(c => c.id) : null);
        this.sortable.set(this.selectedColumns().filter(column => column.sortable));
    }

    onSortField(event: unknown) {
        const form = this.templateForm();
        if (event) {
            form.get(['sort', 'dir'])?.patchValue('desc');
        } else {
            form.get(['sort', 'dir'])?.patchValue(null);
        }
        this.updateSortControlsState();
    }

    onFiltersValueChange(filterForm: FormGroup) {
        this.filtersValid.set(filterForm.valid);
        this.templateForm().get('filters')?.patchValue(filterForm.value);
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
        if (!form) return;
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
