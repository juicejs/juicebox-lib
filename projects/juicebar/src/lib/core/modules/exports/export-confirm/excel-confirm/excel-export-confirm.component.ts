import {Component, inject, ChangeDetectionStrategy, signal} from '@angular/core';
import {DialogRef, DIALOG_DATA} from '@angular/cdk/dialog';
import moment from 'moment';
import {ExportsService} from '../../exports.service';
import {HelperService} from '../../../../shared/services/helper.service';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {ExportsTranslationPipe} from '../../i18n/exports.translation';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {ConfigurationService} from '../../../../shared/services/configuration.service';
import {SHARED_IMPORTS} from '../../../../shared/shared-imports';
import {ExportFiltersComponent} from '../../components/export-filters/export-filters.component';
import {exportFilterValues} from '../../components/export-filters/export-filter-values';

export interface ExcelExportConfirmDialogData {
    fileName?: string;
    exportStrategyKey?: string;
    exportTemplate?: any;
}

@Component({
    selector: 'export-confirm',
    templateUrl: './excel-export-confirm.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    SHARED_IMPORTS,
    ReactiveFormsModule,
    ExportsTranslationPipe,
    ExportFiltersComponent
]
})
export class ExcelExportConfirmComponent {
    readonly promiseBtn = signal<Promise<any> | null>(null);
    readonly isLoading = signal(false);
    readonly allowFiltersEditOnConfirm = signal(false);
    readonly filters = signal<Array<{id, label, type, value}> | null>(null);

    readonly fileNameCtrl = new FormControl<string>('');
    private selectedFilters: any;
    private filterForm: FormGroup;

    private readonly exportStrategyKey: string;
    private readonly exportTemplate: any;
    private readonly i18n: ExportsTranslationPipe;

    private exportsService = inject(ExportsService);
    private helper = inject(HelperService);
    private juicebox = inject(JuiceboxService);
    private configurations = inject(ConfigurationService);
    public dialogRef = inject<DialogRef<boolean>>(DialogRef);
    public data = inject<ExcelExportConfirmDialogData>(DIALOG_DATA);

    constructor() {
        this.i18n = new ExportsTranslationPipe(this.juicebox);
        this.exportStrategyKey = this.data.exportStrategyKey;
        this.exportTemplate = this.data.exportTemplate;
        if (this.data.fileName) this.fileNameCtrl.setValue(this.data.fileName);
    }

    async ngOnInit() {
        const configuration = await this.configurations.getByKey('excel:export:strategies');
        if (configuration?.payload?.options?.allowFiltersEditOnConfirm) {
            this.allowFiltersEditOnConfirm.set(true);
            await this.getDataSourceFilters();
        }
    }

    /** If the filters can't be loaded, the dialog works as in the old app: the export uses the template's saved filters */
    private async getDataSourceFilters() {
        this.isLoading.set(true);
        try {
            const result = await this.exportsService.getFilters(this.exportTemplate.data_source_key);
            if (!result?.success || !Array.isArray(result.payload)) throw new Error(result?.error);
            this.filters.set(result.payload.map(filter => {
                const _filter: {id, value} = this.exportTemplate.filters?.find(_filter => _filter.id === filter.id);
                return {...filter, value: _filter ? _filter.value : null};
            }));
        } catch {
            this.allowFiltersEditOnConfirm.set(false);
            this.juicebox.showToast('warning', this.i18n.transform('filters_load_failed'));
        } finally {
            this.isLoading.set(false);
        }
    }

    cancel() {
        this.dialogRef.close(false);
    }

    onFiltersValueChange(filterForm: FormGroup) {
        this.selectedFilters = exportFilterValues(filterForm);
        this.filterForm = filterForm;
    }

    async export() {
        this.promiseBtn.set((async () => {
            if (this.allowFiltersEditOnConfirm() && this.filterForm?.dirty) {
                await this.exportsService.editExportTemplateFilters(this.exportTemplate._id, {filters: this.selectedFilters});
            }

            const result = await this.exportsService.exportData(this.exportTemplate._id, this.exportStrategyKey, {language: this.juicebox.getLanguage()});

            let fileName = this.fileNameCtrl.value || this.exportTemplate.name + '_' + moment().format('DD.MM.YYYY');

            if (result.size <= 1024 * 4) {
                const string = await result.text();
                if (string.indexOf('Error') > -1 || string.indexOf(',') === -1) {
                    this.juicebox.showToast('error', this.i18n.transform('download_failed'));
                    return;
                }
                const res = JSON.parse(string);
                if (res.error) {
                    this.juicebox.showToast('error', this.i18n.transform('download_failed'));
                    return;
                }
            }

            fileName = `${fileName}.xlsx`;
            const url = window.URL.createObjectURL(result);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            await this.helper.pause();
            this.dialogRef.close(true);
        })());
    }
}
