import {Component, OnInit, inject, ChangeDetectionStrategy} from '@angular/core';
import {DialogRef, DIALOG_DATA} from '@angular/cdk/dialog';
import moment from 'moment';
import {ExportsService} from '../../exports.service';
import {HelperService} from '../../../../shared/services/helper.service';
import {MultiLanguageObject} from '../../../../shared/pipes/auto-language.pipe';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {ExportsTranslationPipe} from "../../i18n/exports.translation";
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {SharedModule} from '../../../../shared/shared.module';

export interface PdfExportConfirmDialogData {
    fileName?: string;
    exportStrategyKey?: string;
    dataSourceKey?: string;
    exportTemplate?: any;
}

@Component({
    selector: 'export-confirm',
    styleUrls: [],
    templateUrl: './pdf-export-confirm.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        FormsModule,
        SharedModule,
        ExportsTranslationPipe
    ]
})
export class PdfExportConfirmComponent implements OnInit {
    promiseBtn;
    fileName: string;
    exportStrategyKey: string;
    dataSourceKey: string;
    exportTemplate: any;
    fileNameProperties: Array<{id, label, description?: MultiLanguageObject, sortable}> = [];
    selectedFileNameProperty: string;
    i18n: ExportsTranslationPipe;

    private exportsService = inject(ExportsService);
    private helper = inject(HelperService);
    private exports = inject(ExportsService);
    private juicebox = inject(JuiceboxService);
    public dialogRef = inject<DialogRef<boolean>>(DialogRef);
    public data = inject<PdfExportConfirmDialogData>(DIALOG_DATA);

    constructor() {
        this.i18n = new ExportsTranslationPipe(this.juicebox);

        const data = this.data;
        this.fileName = data.fileName;
        this.exportStrategyKey = data.exportStrategyKey;
        this.dataSourceKey = data.dataSourceKey;
        this.exportTemplate = data.exportTemplate;
    }

    ngOnInit(): void {
        this.getDataSourceFileNameColumns(this.dataSourceKey, this.exportTemplate._id)
    }

    cancel() {
        this.dialogRef.close(false);
    }

  async export() {
    this.promiseBtn = (async () => {
      const result = await this.exportsService.exportData(this.exportTemplate._id, this.exportStrategyKey, {
        language: this.juicebox.getLanguage(),
        exportStrategyOptions: { fileNameProperty: this.selectedFileNameProperty }
      });

      if (!this.fileName) {
        this.fileName = this.exportTemplate.name + '_' + moment().format('DD.MM.YYYY');
      }

      // Error checking for small files
      if (result.size <= 1024 * 4) {
        const string = await result.text();
        if (string.indexOf('Error') > -1 || string.indexOf(",") === -1) {
          this.juicebox.showToast('error', this.i18n.transform('download_failed'));
          return;
        }
        const res = JSON.parse(string);
        if (res.error) {
          this.juicebox.showToast('error', this.i18n.transform('download_failed'));
          return;
        }
      }

      // Native download using browser APIs
      this.fileName = `${this.fileName}.zip`;
      this.juicebox.downloadBlob(result, this.fileName)

      await this.helper.pause();
      this.dialogRef.close(true);
    })();
  }

    async getDataSourceFileNameColumns(exportTemplateId: string, dataSourceKey: string) {
        const result = await this.exports.getDataSourceFileNameColumns(dataSourceKey, exportTemplateId);
        if (!result) return;
        if (result.success) {
            this.fileNameProperties = result.payload;
        } else {
            this.juicebox.showToast("error", result.error)
        }
    }

    customDropdownSearchForLocalisedObject = (term: string, item: any) => {
        return this.helper.customDropdownSearchForLocalisedObject(term, item.label);
    }

}
