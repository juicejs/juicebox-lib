import {Component, inject, OnInit, signal} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {DIALOG_DATA, DialogRef} from '@angular/cdk/dialog';
import {
    ButtonComponent,
    DialogActionsComponent,
    DialogContentComponent,
    DialogTitleComponent,
    FormFieldComponent,
    InputDirective,
    LabelComponent,
    OptionComponent,
    SelectComponent,
} from '../../../../../ui-components';
import {formatDate} from '../../../../../ui-components/datepicker/date-utils';
import {PromiseButtonDirective} from '../../../../shared/directives/PromiseButton';
import {AutoLanguagePipe} from '../../../../shared/pipes/auto-language.pipe';
import {HelperService} from '../../../../shared/services/helper.service';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {exportErrorKey, injectExportsOptions, isFailedExport} from '../../exports-shared';
import {ExportsService} from '../../exports.service';
import {ExportsTranslationPipe} from '../../i18n/exports.translation';
import {ExportColumn} from '../../types/ExportColumn';
import {ExportTemplate} from '../../types/ExportTemplate';

export interface PdfExportConfirmDialogData {
    fileName?: string;
    exportStrategyKey: string;
    dataSourceKey: string;
    exportTemplate: ExportTemplate;
}

/** Downloads the template's PDFs as a zip, under a name, with the column each PDF is named after */
@Component({
    selector: 'app-pdf-export-confirm',
    templateUrl: './pdf-export-confirm.component.html',
    imports: [
        ReactiveFormsModule,
        DialogTitleComponent,
        DialogContentComponent,
        DialogActionsComponent,
        FormFieldComponent,
        LabelComponent,
        InputDirective,
        SelectComponent,
        OptionComponent,
        ButtonComponent,
        PromiseButtonDirective,
        AutoLanguagePipe,
        ExportsTranslationPipe,
    ],
})
export class PdfExportConfirmComponent implements OnInit {
    private readonly exports = inject(ExportsService);
    private readonly helper = inject(HelperService);
    private readonly juicebox = inject(JuiceboxService);
    private readonly i18n = inject(ExportsTranslationPipe);
    private readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);
    private readonly data = inject<PdfExportConfirmDialogData>(DIALOG_DATA);
    private readonly options = injectExportsOptions();

    protected readonly fileName = new FormControl(this.data.fileName ?? '', {nonNullable: true});
    protected readonly fileNameColumns = signal<ExportColumn[]>([]);
    protected readonly fileNameColumn = signal<string | null>(null);
    protected readonly exportPromise = signal<Promise<void> | null>(null);

    async ngOnInit(): Promise<void> {
        const result = await this.exports.getDataSourceFileNameColumns(this.data.exportTemplate._id, this.data.dataSourceKey);
        if (!result) return;
        if (result.success) this.fileNameColumns.set(result.payload ?? []);
        else this.juicebox.showToast('error', result.error ?? '');
    }

    protected cancel(): void {
        this.dialogRef.close(false);
    }

    protected export(): void {
        this.exportPromise.set(this.download());
    }

    private async download(): Promise<void> {
        const template = this.data.exportTemplate;
        try {
            const file = await this.exports.exportData(template._id, this.data.exportStrategyKey, {
                language: this.juicebox.getLanguage(),
                exportStrategyOptions: {fileNameProperty: this.fileNameColumn() ?? undefined},
            }, this.options.downloadTimeoutMs);
            if (await isFailedExport(file)) {
                this.juicebox.showToast('error', this.i18n.transform('download_failed'));
                return;
            }
            const name = this.fileName.value || `${template.name}_${formatDate(new Date())}`;
            this.juicebox.downloadBlob(file, `${name}.zip`);
            await this.helper.pause();
            this.dialogRef.close(true);
        } catch (error) {
            this.juicebox.showToast('error', this.i18n.transform(exportErrorKey(error)));
        }
    }
}
