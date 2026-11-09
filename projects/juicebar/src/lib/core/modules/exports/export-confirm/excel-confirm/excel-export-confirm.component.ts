import {Component, inject, OnInit, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {DIALOG_DATA, DialogRef} from '@angular/cdk/dialog';
import {
    ButtonComponent,
    DialogActionsComponent,
    DialogContentComponent,
    DialogTitleComponent,
    FormFieldComponent,
    InputDirective,
    LabelComponent,
    ProgressSpinnerComponent,
} from '../../../../../ui-components';
import {formatDate} from '../../../../../ui-components/datepicker/date-utils';
import {PromiseButtonDirective} from '../../../../shared/directives/PromiseButton';
import {ConfigurationService} from '../../../../shared/services/configuration.service';
import {HelperService} from '../../../../shared/services/helper.service';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {ExportFiltersComponent} from '../../components/export-filters/export-filters.component';
import {exportFilterValues} from '../../components/export-filters/export-filter-values';
import {exportErrorKey, injectExportsOptions, isFailedExport} from '../../exports-shared';
import {ExportsService} from '../../exports.service';
import {ExportsTranslationPipe} from '../../i18n/exports.translation';
import {ExportFilter} from '../../types/ExportFilter';
import {ExportTemplate} from '../../types/ExportTemplate';

export interface ExcelExportConfirmDialogData {
    fileName?: string;
    exportStrategyKey: string;
    exportTemplate: ExportTemplate;
}

/**
 * Downloads the template's Excel file under a name (the template's and the day's by default). With the
 * `excel:export:strategies` option `allowFiltersEditOnConfirm` the filters can be changed first; changed ones are
 * stored on the template before the export, as in QC.
 */
@Component({
    selector: 'app-excel-export-confirm',
    templateUrl: './excel-export-confirm.component.html',
    styleUrl: './excel-export-confirm.component.scss',
    imports: [
        ReactiveFormsModule,
        DialogTitleComponent,
        DialogContentComponent,
        DialogActionsComponent,
        FormFieldComponent,
        LabelComponent,
        InputDirective,
        ButtonComponent,
        ProgressSpinnerComponent,
        PromiseButtonDirective,
        ExportsTranslationPipe,
        ExportFiltersComponent,
    ],
})
export class ExcelExportConfirmComponent implements OnInit {
    private readonly exports = inject(ExportsService);
    private readonly helper = inject(HelperService);
    private readonly juicebox = inject(JuiceboxService);
    private readonly configurations = inject(ConfigurationService);
    private readonly i18n = inject(ExportsTranslationPipe);
    private readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);
    private readonly data = inject<ExcelExportConfirmDialogData>(DIALOG_DATA);
    private readonly options = injectExportsOptions();

    protected readonly fileName = new FormControl(this.data.fileName ?? '', {nonNullable: true});
    protected readonly loading = signal(false);
    /** The filters to change before exporting, when the project allows it */
    protected readonly filters = signal<ExportFilter[] | null>(null);
    protected readonly exportPromise = signal<Promise<void> | null>(null);
    private filterForm: FormGroup | null = null;

    async ngOnInit(): Promise<void> {
        const configuration = await this.configurations.getByKey('excel:export:strategies');
        if (configuration?.payload?.options?.allowFiltersEditOnConfirm) await this.loadFilters();
    }

    protected cancel(): void {
        this.dialogRef.close(false);
    }

    protected onFiltersValueChange(filterForm: FormGroup): void {
        this.filterForm = filterForm;
    }

    protected export(): void {
        this.exportPromise.set(this.download());
    }

    /** Without the filters the dialog works as in the old app: the export uses the template's saved filters */
    private async loadFilters(): Promise<void> {
        const template = this.data.exportTemplate;
        this.loading.set(true);
        try {
            const result = await this.exports.getFilters(template.data_source_key);
            if (!result?.success || !Array.isArray(result.payload)) throw new Error(result?.error);
            this.filters.set(result.payload.map(filter => ({
                ...filter,
                value: template.filters?.find(saved => saved.id === filter.id)?.value ?? null,
            })));
        } catch {
            this.juicebox.showToast('warning', this.i18n.transform('filters_load_failed'));
        } finally {
            this.loading.set(false);
        }
    }

    private async download(): Promise<void> {
        const template = this.data.exportTemplate;
        try {
            if (this.filterForm?.dirty) {
                const stored = await this.exports.editExportTemplateFilters(template._id, {filters: exportFilterValues(this.filterForm)});
                if (!stored?.success) {
                    this.juicebox.showToast('error', this.i18n.transform('filters_not_saved'));
                    return;
                }
            }
            const file = await this.exports.exportData(template._id, this.data.exportStrategyKey,
                {language: this.juicebox.getLanguage()}, this.options.downloadTimeoutMs);
            if (await isFailedExport(file)) {
                this.juicebox.showToast('error', this.i18n.transform('download_failed'));
                return;
            }
            const name = this.fileName.value || `${template.name}_${formatDate(new Date())}`;
            this.juicebox.downloadBlob(file, `${name}.xlsx`);
            await this.helper.pause();
            this.dialogRef.close(true);
        } catch (error) {
            this.juicebox.showToast('error', this.i18n.transform(exportErrorKey(error)));
        }
    }
}
