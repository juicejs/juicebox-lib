import {Component, OnInit, inject, ChangeDetectionStrategy} from '@angular/core';
import {DialogRef, DIALOG_DATA} from '@angular/cdk/dialog';
import moment from 'moment';
import {ExportsService} from '../../exports.service';
import {HelperService} from '../../../../shared/services/helper.service';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {ExportsTranslationPipe} from "../../i18n/exports.translation";
import {FormControl, FormGroup} from "@angular/forms";
import {ConfigurationService} from '../../../../shared/services/configuration.service';
import {CommonModule} from '@angular/common';
import {SharedModule} from '../../../../shared/shared.module';

export interface ExcelExportConfirmDialogData {
    fileName?: string;
    exportStrategyKey?: string;
    exportTemplate?: any;
}

@Component({
    selector: 'export-confirm',
    styleUrls: [],
    templateUrl: './excel-export-confirm.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        SharedModule,
        ExportsTranslationPipe
    ]
})
export class ExcelExportConfirmComponent implements OnInit {
    promiseBtn;
    fileNameCtrl = new FormControl<string>('');
    get fileName(): string { return this.fileNameCtrl.value || ''; }
    set fileName(v: string) { this.fileNameCtrl.setValue(v ?? ''); }
    exportStrategyKey: string;
    exportTemplate: any;
    i18n: ExportsTranslationPipe;

    filters: Array<{id, label, type, value}>;
    selectedFilters: any;

    isLoading: boolean;
    allowFiltersEditOnConfirm: boolean;

    filterForm: FormGroup;

    private exportsService = inject(ExportsService);
    private helper = inject(HelperService);
    private juicebox = inject(JuiceboxService);
    private configurations = inject(ConfigurationService);
    public dialogRef = inject<DialogRef<boolean>>(DialogRef);
    public data = inject<ExcelExportConfirmDialogData>(DIALOG_DATA);

    constructor() {
        this.i18n = new ExportsTranslationPipe(this.juicebox);

        const data = this.data;
        this.fileName = data.fileName;
        this.exportStrategyKey = data.exportStrategyKey;
        this.exportTemplate = data.exportTemplate;
    }
    async ngOnInit() {
        const configuration = await this.configurations.getByKey("excel:export:strategies");
        if (configuration?.payload?.options?.allowFiltersEditOnConfirm) {
            this.allowFiltersEditOnConfirm = true;
            await this.getDataSourceFilters();
        }
    }

    async getDataSourceFilters() {
        this.isLoading = true;
        const result = await this.exportsService.getFilters(this.exportTemplate.data_source_key);
        this.filters = result.payload.map(filter => {
            const _filter: {id, value} = this.exportTemplate.filters.find(_filter => _filter.id === filter.id)
            return {...filter, value: _filter ? _filter.value : null}
        });
        this.isLoading = false;
    }

    cancel() {
        this.dialogRef.close(false);
    }

    onFiltersValueChange(filterForm: FormGroup) {
        this.selectedFilters = filterForm.value;
        this.filterForm = filterForm;
    }

  async export() {
    this.promiseBtn = (async () => {
      if (this.allowFiltersEditOnConfirm && this.filterForm?.dirty) {
        await this.exportsService.editExportTemplateFilters(this.exportTemplate._id, {filters: this.selectedFilters});
      }

      const result = await this.exportsService.exportData(this.exportTemplate._id, this.exportStrategyKey, {language: this.juicebox.getLanguage()});

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
      this.fileName = `${this.fileName}.xlsx`;
      const url = window.URL.createObjectURL(result);
      const link = document.createElement('a');
      link.href = url;
      link.download = this.fileName;
      document.body.appendChild(link); // Required for Firefox
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      await this.helper.pause();
      this.dialogRef.close(true);
    })();
  }
}
