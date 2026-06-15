import {Component, inject, ChangeDetectionStrategy, signal} from '@angular/core';
import {DialogRef, DIALOG_DATA} from '@angular/cdk/dialog';
import moment from 'moment';
import {ExportsService} from '../../exports.service';
import {HelperService} from '../../../../shared/services/helper.service';
import {AutoLanguagePipe, MultiLanguageObject} from '../../../../shared/pipes/auto-language.pipe';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {ExportsTranslationPipe} from '../../i18n/exports.translation';
import {CommonModule} from '@angular/common';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {SharedModule} from '../../../../shared/shared.module';

export interface PdfExportConfirmDialogData {
    fileName?: string;
    exportStrategyKey?: string;
    dataSourceKey?: string;
    exportTemplate?: any;
}

@Component({
    selector: 'export-confirm',
    templateUrl: './pdf-export-confirm.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        SharedModule,
        ExportsTranslationPipe,
        AutoLanguagePipe,
    ]
})
export class PdfExportConfirmComponent {
    readonly promiseBtn = signal<Promise<any> | null>(null);
    readonly fileNameProperties = signal<Array<{id, label, description?: MultiLanguageObject, sortable}>>([]);
    readonly selectedFileNameProperty = signal<string | null>(null);

    readonly fileNameCtrl = new FormControl<string>('');

    private readonly exportStrategyKey: string;
    private readonly dataSourceKey: string;
    private readonly exportTemplate: any;
    private readonly i18n: ExportsTranslationPipe;

    private exportsService = inject(ExportsService);
    private helper = inject(HelperService);
    private juicebox = inject(JuiceboxService);
    public dialogRef = inject<DialogRef<boolean>>(DialogRef);
    public data = inject<PdfExportConfirmDialogData>(DIALOG_DATA);

    constructor() {
        this.i18n = new ExportsTranslationPipe(this.juicebox);
        this.exportStrategyKey = this.data.exportStrategyKey;
        this.dataSourceKey = this.data.dataSourceKey;
        this.exportTemplate = this.data.exportTemplate;
        if (this.data.fileName) this.fileNameCtrl.setValue(this.data.fileName);
    }

    ngOnInit(): void {
        this.getDataSourceFileNameColumns(this.dataSourceKey, this.exportTemplate._id);
    }

    cancel() {
        this.dialogRef.close(false);
    }

    async export() {
        this.promiseBtn.set((async () => {
            const result = await this.exportsService.exportData(this.exportTemplate._id, this.exportStrategyKey, {
                language: this.juicebox.getLanguage(),
                exportStrategyOptions: {fileNameProperty: this.selectedFileNameProperty()}
            });

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

            fileName = `${fileName}.zip`;
            this.juicebox.downloadBlob(result, fileName);

            await this.helper.pause();
            this.dialogRef.close(true);
        })());
    }

    private async getDataSourceFileNameColumns(dataSourceKey: string, exportTemplateId: string) {
        const result = await this.exportsService.getDataSourceFileNameColumns(dataSourceKey, exportTemplateId);
        if (!result) return;
        if (result.success) {
            this.fileNameProperties.set(result.payload);
        } else {
            this.juicebox.showToast('error', result.error);
        }
    }
}
