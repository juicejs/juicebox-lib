import {Component, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {CdkDragDrop, moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';
import {ExportColumn} from '../types/ExportColumn';
import {ExportsTranslationPipe} from '../i18n/exports.translation';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {ExportsService} from '../exports.service';
import {HelperService} from '../../../shared/services/helper.service';
import {Router} from '@angular/router';
import {ConfigurationService} from '../../../shared/services/configuration.service';
import {ExportStrategy} from '../types/ExportStrategy';
import { MultiLanguageObject, AutoLanguagePipe} from '../../../shared/pipes/auto-language.pipe';

@Component({
    selector: 'app-export-template-create',
    templateUrl: './export-template-create.component.html',
    styleUrls: ['./export-template-create.component.scss']
})
export class ExportTemplateCreateComponent implements OnInit {

    templateForm: FormGroup;
    dataSources: Array<{key: string, name: string}> = [];
    columns: Array<{id, label, description?: MultiLanguageObject, sortable, group?: string}> = [];
    filters: Array<{id, property, label, type}> = [];

    // from master:
    // dataSources: Array<{key: string, name: string}> = [];
    // columns: Array<{
    //     group?: string;
    //     id, label, description?: MultiLanguageObject, sortable}> = [];
    // filters: Array<{id, property, label, type}> = [];


    selectedDataSource: ExportStrategy;
    selectedColumns: Array<ExportColumn> = [];

    sortable: Array<ExportColumn> = [];

    filtersValid: boolean;
    message: boolean;

    autoLanguage: AutoLanguagePipe;
    promiseBtn;

    groupColumns: any = null;
    selectedGroupColumns: any = [];
    amgExport: boolean = false;

    constructor(public juicebox: JuiceboxService,
                private exports: ExportsService,
                private helper: HelperService,
                private router: Router,
                private configurations: ConfigurationService,
                private i18n: ExportsTranslationPipe) {
        this.juicebox.navigationEvent({
            location: this.i18n.transform('exports'),
            subject: this.i18n.transform('create_export_template'),
            link: '/main/exports'
        });
    }

    ngOnInit() {

        this.autoLanguage = new AutoLanguagePipe(this.juicebox)

        this.getDataSources();

        this.templateForm = new FormGroup({
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
        });

        // Initially disable sort controls
        this.updateSortControlsState();
    }

    getDataSources() {
        this.exports.getDataSourceStrategies().then(async result => {
            if (!result) {
                return;
            }
            if (result.success) {
                //just for visitor, if admin is not logged in, do not show vendor strategy to choose
                const getMasterOrganisationConfiguration = await this.configurations.getByKey('juice:master-organisation');
                if (getMasterOrganisationConfiguration?.payload?.value != this.juicebox.getUserOrganisationId()) {
                    for (let source of result.payload as ExportStrategy[]) {
                        if (source.key != 'vendors:strategy') {
                            this.dataSources.push(source);
                        }
                    }
                } else {
                    this.dataSources = result.payload as ExportStrategy[];

                }
                this.dataSources = [...this.dataSources];
            } else {
                this.juicebox.showToast('error', this.i18n.transform(result.error));
            }
        });
    }

    async getColumns(datasourceStrategyKey: string) {
        const amg_conf = await this.configurations.getByKey('amgshop');
        if (amg_conf && amg_conf.success) {
            this.amgExport = true;
        }

        const result = await this.exports.getColumns(datasourceStrategyKey);
        if (!result) {
            return;
        }
        if (result.success) {
            this.columns = result.payload || [];
            this.selectedColumns = [];
            this.sortable = [];

            if (this.amgExport) {
                this.groupColumns = null;
                if (this.columns?.some(column => column.group)) {
                    if (this.columns.some(column => column.group)) {
                        const groupColumns: { [group: string]: any[] } = {};
                        this.columns.forEach(column => {
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

            this.templateForm.get('columns')?.reset(null);
            this.templateForm.get(['sort'])?.reset();
            if (datasourceStrategyKey == 'invoice:strategy') {
                this.selectAllColumns();
            }
        } else {
            this.juicebox.showToast('error', result.error as string);
        }
    }

    async getFilters(datasourceStrategyKey: string) {
        const result = await this.exports.getFilters(datasourceStrategyKey);
        if (!result) {
            return;
        }
        if (result.success) {
            (this.filters as any) = result.payload;
            this.templateForm.get('filters')?.reset(null);
        } else {
            this.juicebox.showToast('error', result.error as string);
        }
    }

    create() {
        this.templateForm.markAllAsTouched();
        if (this.templateForm.invalid) {
            return;
        }

        this.promiseBtn = (async () => {
            const result = await this.exports.createExportTemplate(this.templateForm.value);
            if (!result) {
                return;
            }
            if (result.success) {
                this.juicebox.showToast("success", this.i18n.transform('export_template_created'))
                if (this.templateForm.value.data_source_key == 'sap-data:strategy')
                    this.juicebox.showToast("warning", this.i18n.transform('sap_export_create_admin'))
                await this.router.navigateByUrl('/main/exports');
            } else {
                this.juicebox.showToast('error', this.i18n.transform(result.error));
            }
        })();
    }

    async onDataSourceChange(dataSourceKey: string) {
      console.log(dataSourceKey)
        // @ts-ignore
      this.selectedDataSource = this.dataSources.find(ds => ds.key === dataSourceKey);
        this.templateForm.controls["columns"].reset();
        this.templateForm.controls["filters"].reset();
        this.templateForm.controls["sort"].reset();
        await this.getColumns(dataSourceKey);
        await this.getFilters(dataSourceKey);
    }

    onColumnSelected() {
        this.templateForm.get('columns')?.patchValue(this.selectedColumns.length ? this.selectedColumns.map(c => c.id) : null);
        this.sortable = this.selectedColumns.filter(column => column.sortable);

        // clear sort if sortable does not have that property anymore
        if (!this.sortable.find(column => column.id === this.templateForm.value?.sort?.prop)) {
            this.templateForm.get('sort')?.reset();
        }

        // Enable/disable sort controls based on available sortable columns
        this.updateSortControlsState();
    }

    selectAllColumns() {
        this.selectedColumns = [...this.selectedColumns, ...this.columns];
        this.columns = [];
        this.templateForm.get('columns')?.patchValue(this.selectedColumns.length ? this.selectedColumns.map(c => c.id) : null);
        this.sortable = this.selectedColumns.filter(column => column.sortable);
        this.updateSortControlsState();
    }

    deSelectAllColumns() {
        this.columns = [...this.selectedColumns, ...this.columns];
        this.selectedColumns = [];
        this.templateForm.get('columns')?.patchValue(this.selectedColumns.length ? this.selectedColumns.map(c => c.id) : null);
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

        this.templateForm.get('columns')?.patchValue(this.selectedColumns.length ? this.selectedColumns.map(c => c.id) : null);

        console.log(this.templateForm.get('columns')?.value)
        this.sortable = this.selectedColumns.filter(column => column.sortable);

        if (!this.sortable.find(column => column.id === this.templateForm.value?.sort?.prop)) {
            this.templateForm.get('sort')?.reset();
        }
    }

    selectAllGroupColumns(group: string) {
        this.selectedGroupColumns[group] = [...this.selectedGroupColumns[group], ...this.groupColumns[group]];
        this.selectedColumns = [...this.selectedColumns, ...this.selectedGroupColumns[group]];

        this.groupColumns[group] = [];
        this.columns = [];
        this.templateForm.get('columns')?.patchValue(this.selectedColumns.length ? this.selectedColumns.map(c => c.id) : null);
        this.sortable = this.selectedGroupColumns[group].filter(column => column.sortable);
    }

    deSelectAllGroupColumns(group: string) {
        this.groupColumns[group] = [...this.selectedGroupColumns[group], ...this.groupColumns[group]];
        this.selectedColumns = this.selectedColumns.filter(column => !this.selectedGroupColumns[group].includes(column));

        this.selectedGroupColumns[group] = [];

        this.templateForm.get('columns')?.patchValue(this.selectedColumns.length ? this.selectedColumns.map(c => c.id) : null);
        this.sortable = this.selectedColumns.filter(column => column.sortable);
    }

    onSortField(event: unknown) {
        if (event) {
            this.templateForm.get(['sort', 'dir'])?.patchValue('desc');
        } else {
            this.templateForm.get(['sort', 'dir'])?.patchValue(null);
        }
        // Update sort direction control state when sort field changes
        this.updateSortControlsState();
    }

    onFiltersValueChange(filterForm: FormGroup) {
        this.filtersValid = filterForm.valid;
        this.templateForm.get('filters')?.patchValue(filterForm.value);
    }

    customDropdownSearchForLocalisedObject = (term: string, item: any) => {
        return this.helper.customDropdownSearchForLocalisedObject(term, item.label);
    }

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

    protected readonly Object = Object;
}
