import {ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from "@angular/forms";
import {ActivatedRoute} from "@angular/router";
import {CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';
import {Subscription} from "rxjs";
import {ExportsService} from '../exports.service';
import {ExportsTranslationPipe} from '../i18n/exports.translation';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {HelperService} from '../../../shared/services/helper.service';
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
export class ExportTemplateEditComponent implements OnInit, OnDestroy {

    exportTemplateId: string;
    exportTemplate: ExportTemplate;

    templateForm: FormGroup;
    // dataSources: Array<{key: string, name: string}>;
    // columns: Array<{
    //     group?: any;
    //     id, label, description?: MultiLanguageObject, sortable}> = [];
    // filters: Array<{id, label, type, value}>;
    dataSources: Array<ExportStrategy> = [];
    columns: Array<ExportColumn> = [];
    filters: Array<ExportFilter> = [];

    filtersValid: boolean;

    selectedDataSource: ExportStrategy = null;
    selectedColumns: Array<ExportColumn> = [];

    sortable: Array<ExportColumn> = [];

    promiseBtn;
    sub = new Subscription();

    groupColumns: any = null;
    selectedGroupColumns: any = [];
    amgExport: boolean = false;

    public juicebox = inject(JuiceboxService);
    private exports = inject(ExportsService);
    private helper = inject(HelperService);
    private route = inject(ActivatedRoute);
    private configurationService = inject(ConfigurationService);
    private i18n = inject(ExportsTranslationPipe);

    async ngOnInit() {
        const amg_conf = await this.configurationService.getByKey('amgshop');
        if (amg_conf && amg_conf.success) {
            this.amgExport = true;
        }

        this.sub.add(this.route.params.subscribe(async value => {
            this.exportTemplateId = value['id'];
            const ready = await this.getData();
            if (!ready) return;

            this.juicebox.navigationEvent({
                location: this.i18n.transform('exports'),
                subject: this.exportTemplate.name,
                link: '/main/exports'
            });

            this.selectedColumns = this.columns.filter(column => this.exportTemplate.columns.includes(column.id));
            this.sortable = this.selectedColumns.filter(column => column.sortable);
            this.columns = this.columns.filter(column => !this.selectedColumns.map(c => c.id).includes(column.id));

            if(this.amgExport && this.groupColumns) {
                Object.keys(this.groupColumns).forEach(group => {
                    this.selectedGroupColumns[group] = this.groupColumns[group].filter(column => this.exportTemplate.columns.includes(column.id));
                    this.groupColumns[group] = this.groupColumns[group].filter(column => !this.selectedGroupColumns[group].map(c => c.id).includes(column.id));
                });
            }

            this.templateForm = new FormGroup({
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
            })
        }))
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }

    private async getData() {
        await this.getExportTemplate();
        if (!this.exportTemplate) return false;

        await this.getDataSources();
        if (!this.dataSources || !this.dataSources.length) return false;

        await this.getColumns(this.exportTemplate.data_source_key);
        if (!this.columns) return false;

        await this.getFilters(this.exportTemplate.data_source_key);

        return true;
    }

    private async getExportTemplate() {
        if (!this.exportTemplateId) return;

        const result = await this.exports.getExportTemplate(this.exportTemplateId);
        if (!result) return;

        if (!result.success) {
            this.juicebox.showToast("error",result.error);
            return;
        }

        (this.exportTemplate as any) = result.payload;
    }

    private async getDataSources() {
        const result = await this.exports.getDataSourceStrategies();
        if (!result) return;

        if (!result.success) {
            this.juicebox.showToast("error",result.error);
            return;
        }

        (this.dataSources as any) = result.payload;
        this.selectedDataSource = this.dataSources.find(({key}) => this.exportTemplate.data_source_key === key);
    }

    private async getColumns(datasourceStrategyKey: string) {
        const result = await this.exports.getColumns(datasourceStrategyKey);
        if (!result) return;
        if (!result.success) {
            this.juicebox.showToast("error",result.error);
            return;
        }

        const columns: any = result.payload;
        if (columns?.length && this.exportTemplate?.columns?.length) {
            columns.sort((col1, col2) => {
                return this.exportTemplate.columns.indexOf(col1.id) - this.exportTemplate.columns.indexOf(col2.id);
            });
        }

        if (this.amgExport) {
            this.groupColumns = null;
            if (columns.some(column => column.group)) {
                if (columns.some(column => column.group)) {
                    const groupColumns: { [group: string]: any[] } = {};
                    columns.forEach(column => {
                        const group = column.group || 'Ungrouped';
                        if (!groupColumns[group]) {
                            groupColumns[group] = [];
                        }
                        groupColumns[group].push(column);
                    });

                    this.groupColumns = groupColumns;

                    Object.keys(this.groupColumns).forEach(group => {
                        this.selectedGroupColumns[group] = [];
                    });
                }
            }
        }

        this.columns = columns;

        this.selectedColumns = [];
        this.sortable = []
    }

    private async getFilters(datasourceStrategyKey: string) {
        const result = await this.exports.getFilters(datasourceStrategyKey);
        if (!result) return;
        if (!result.success) {
            this.juicebox.showToast("error",result.error);
            return;
        }

        const amg_conf = await this.configurationService.getByKey('amgshop');
        if (amg_conf && amg_conf.success) {
            for(let filter of result.payload) {
                if(filter.id === 'category') {
                    (<any>filter).items = await this.juicebox.pleaseExtendYourServiceDontDoThis().request("booking-service", "getExportCategories", []);
                }
            }
        }

        (this.filters as any) = result.payload.map(filter => {
            const _filter: {id, value} = this.exportTemplate.filters.find(_filter => _filter.id === filter.id)
            return {...filter, value: _filter ? _filter.value : null}
        });
    }

    save() {
        this.templateForm.markAllAsTouched();
        if (this.templateForm.invalid) return;

        this.promiseBtn = (async () => {
            const result = await this.exports.editExportTemplate(this.exportTemplateId, this.templateForm.value);
            if (!result) return;
            if (result.success) {
                this.juicebox.showToast("success",this.i18n.transform('template_saved'));
            } else {
                this.juicebox.showToast("error",this.i18n.transform(result.error));
            }
        })();
    }

    async onDataSourceChange(dataSource: ExportStrategy) {
        this.selectedDataSource = dataSource;
      this.templateForm.controls["columns"].reset();
      this.templateForm.controls["filters"].reset();
      this.templateForm.controls["sort"].reset();
        await this.getColumns(dataSource.key);
        await this.getFilters(dataSource.key);
    }

    onColumnSelected() {
        this.templateForm.get('columns').patchValue(this.selectedColumns.length ? this.selectedColumns.map(c => c.id) : null);
        this.sortable = this.selectedColumns.filter(column => column.sortable);

        // clear sort if sortable does not have that property anymore
        if (!this.sortable.find(column => column.id === this.templateForm.value?.sort?.prop)) this.templateForm.get('sort').reset();
        
        // Enable/disable sort controls based on available sortable columns
        this.updateSortControlsState();
    }

    selectAllColumns() {
        this.selectedColumns = [...this.selectedColumns, ...this.columns]
        this.columns = [];
        this.templateForm.get('columns').patchValue(this.selectedColumns.length ? this.selectedColumns.map(c => c.id) : null);
        this.sortable = this.selectedColumns.filter(column => column.sortable);
        this.updateSortControlsState();
    }

    deSelectAllColumns() {
        this.columns = [...this.selectedColumns, ...this.columns]
        this.selectedColumns = [];
        this.templateForm.get('columns').patchValue(this.selectedColumns.length ? this.selectedColumns.map(c => c.id) : null);
        this.sortable = this.selectedColumns.filter(column => column.sortable);
        this.updateSortControlsState();
    }

    onGroupColumnSelected() {
        this.selectedColumns = [];
        Object.keys(this.selectedGroupColumns).forEach(group => {
            for(let column of this.selectedGroupColumns[group]) {
                this.selectedColumns.push(column);
            }
        });

        this.templateForm.get('columns').patchValue(this.selectedColumns.length ? this.selectedColumns.map(c => c.id) : null);
        this.sortable = this.selectedColumns.filter(column => column.sortable);

        if (!this.sortable.find(column => column.id === this.templateForm.value?.sort?.prop)) {
            this.templateForm.get('sort').reset();
        }
        
        this.updateSortControlsState();
    }

    selectAllGroupColumns(group: string) {
        this.selectedGroupColumns[group] = [...this.selectedGroupColumns[group], ...this.groupColumns[group]];
        this.selectedColumns = [...this.selectedColumns, ...this.selectedGroupColumns[group]];

        this.groupColumns[group] = [];
        this.columns = [];
        this.templateForm.get('columns').patchValue(this.selectedColumns.length ? this.selectedColumns.map(c => c.id) : null);
        this.sortable = this.selectedGroupColumns[group].filter(column => column.sortable);
    }

    deSelectAllGroupColumns(group: string) {
        this.groupColumns[group] = [...this.selectedGroupColumns[group], ...this.groupColumns[group]];
        this.selectedColumns = this.selectedColumns.filter(column => !this.selectedGroupColumns[group].includes(column));

        this.selectedGroupColumns[group] = [];

        this.templateForm.get('columns').patchValue(this.selectedColumns.length ? this.selectedColumns.map(c => c.id) : null);
        this.sortable = this.selectedColumns.filter(column => column.sortable);
    }


    onSortField(event: unknown) {
        if (event) {
            this.templateForm.get(['sort', 'dir']).patchValue('desc');
        } else {
            this.templateForm.get(['sort', 'dir']).patchValue(null);
        }
        // Update sort direction control state when sort field changes
        this.updateSortControlsState();
    }

    onFiltersValueChange(filterForm: FormGroup) {
        this.filtersValid = filterForm.valid;
        this.templateForm.get('filters').patchValue(filterForm.value);
    }

    customDropdownSearchForLocalisedObject = (term: string, item: any) => {
        return this.helper.customDropdownSearchForLocalisedObject(term, item.label);
    }

    protected readonly Object = Object;

    onColumnDrop(event: CdkDragDrop<ExportColumn[]>) {
        if (event.previousContainer === event.container) {
            // Reordering within the same list
            moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
        } else {
            // Moving between available and selected lists
            transferArrayItem(
                event.previousContainer.data,
                event.container.data,
                event.previousIndex,
                event.currentIndex
            );
            
            // Update form if moving to/from selected columns
            if (event.container.data === this.selectedColumns || event.previousContainer.data === this.selectedColumns) {
                this.onColumnSelected();
            }
        }
    }

    onGroupColumnDrop(event: CdkDragDrop<ExportColumn[]>, group: string) {
        if (event.previousContainer === event.container) {
            // Reordering within the same list
            moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
        } else {
            // Moving between available and selected group lists
            transferArrayItem(
                event.previousContainer.data,
                event.container.data,
                event.previousIndex,
                event.currentIndex
            );
            
            // Update form and selection state
            this.onGroupColumnSelected();
        }
    }

    updateSortControlsState() {
        const sortPropControl = this.templateForm.get(['sort', 'prop']);
        const sortDirControl = this.templateForm.get(['sort', 'dir']);
        
        if (this.selectedColumns.length === 0 || this.sortable.length === 0) {
            sortPropControl?.disable();
            sortDirControl?.disable();
        } else {
            sortPropControl?.enable();
            // Direction control enabled only if a sort property is selected
            if (this.templateForm.value?.sort?.prop) {
                sortDirControl?.enable();
            } else {
                sortDirControl?.disable();
            }
        }
    }
}
