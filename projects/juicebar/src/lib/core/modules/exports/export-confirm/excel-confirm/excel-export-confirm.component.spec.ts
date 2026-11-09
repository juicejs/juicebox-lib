import {TestBed} from '@angular/core/testing';
import {DIALOG_DATA, DialogRef} from '@angular/cdk/dialog';
import {EXPORTS_CUSTOMIZATION} from '../../../../../config/base-app.config';
import {provideJuicebarTesting} from '../../../../../../testing/juicebar-testing';
import {ConfigurationService} from '../../../../shared/services/configuration.service';
import {HelperService} from '../../../../shared/services/helper.service';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {ExportsService} from '../../exports.service';
import {ExportsTranslationPipe} from '../../i18n/exports.translation';
import {ExportTemplate} from '../../types/ExportTemplate';
import {ExcelExportConfirmComponent} from './excel-export-confirm.component';

const template: ExportTemplate = {
  _id: 't1', name: 'Orders', data_source_key: 'orders:strategy', columns: ['name'],
  filters: [{id: 'status', value: 'paid'}], sort: {prop: 'name', dir: 'asc'}, deleted: false, updated: '',
  _available_export_strategies: [],
};

describe('ExcelExportConfirmComponent', () => {
  async function setup(allowFiltersEditOnConfirm = false) {
    const close = vi.fn();
    TestBed.configureTestingModule({
      imports: [ExcelExportConfirmComponent],
      providers: [
        ...provideJuicebarTesting(),
        ExportsTranslationPipe,
        {provide: EXPORTS_CUSTOMIZATION, useValue: {options: {downloadTimeoutMs: 90000}}},
        {provide: DialogRef, useValue: {close}},
        {provide: DIALOG_DATA, useValue: {exportStrategyKey: 'excel:export:strategy', exportTemplate: template}},
      ],
    });
    vi.spyOn(TestBed.inject(ConfigurationService), 'getByKey').mockResolvedValue({success: true, payload: {options: {allowFiltersEditOnConfirm}}});
    vi.spyOn(TestBed.inject(HelperService), 'pause').mockResolvedValue(undefined);
    const exports = TestBed.inject(ExportsService);
    vi.spyOn(exports, 'getFilters').mockResolvedValue({success: true, payload: [{id: 'status', label: 'Status', type: 'string'}]});
    const store = vi.spyOn(exports, 'editExportTemplateFilters').mockResolvedValue({success: true});
    const exportData = vi.spyOn(exports, 'exportData').mockResolvedValue(new Blob([new Uint8Array(5000)]));
    const juicebox = TestBed.inject(JuiceboxService);
    const download = vi.spyOn(juicebox, 'downloadBlob').mockImplementation(() => {});
    const toast = vi.spyOn(juicebox, 'showToast');
    const fixture = TestBed.createComponent(ExcelExportConfirmComponent);
    fixture.autoDetectChanges();
    for (let step = 0; step < 3; step++) await new Promise(resolve => setTimeout(resolve));
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const downloadButton = () => Array.from(element.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent?.trim() === 'Download')!;
    return {fixture, element, close, store, exportData, download, toast, downloadButton};
  }

  it('downloads the file as <name>.xlsx with the project\'s time limit, and closes', async () => {
    const {element, fixture, exportData, download, close, downloadButton} = await setup();
    const name = element.querySelector<HTMLInputElement>('input')!;
    name.value = 'march';
    name.dispatchEvent(new Event('input'));
    downloadButton().click();
    await fixture.whenStable();
    for (let step = 0; step < 3; step++) await new Promise(resolve => setTimeout(resolve));
    expect(exportData).toHaveBeenCalledWith('t1', 'excel:export:strategy', {language: 'en_GB'}, 90000);
    expect(download).toHaveBeenCalledWith(expect.any(Blob), 'march.xlsx');
    expect(close).toHaveBeenCalledWith(true);
  });

  it('stores changed filters on the template before the export, as QC does', async () => {
    const {element, fixture, store, exportData, downloadButton} = await setup(true);
    const status = element.querySelectorAll<HTMLInputElement>('input')[1];
    status.value = 'open';
    status.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    downloadButton().click();
    for (let step = 0; step < 3; step++) await new Promise(resolve => setTimeout(resolve));
    expect(store).toHaveBeenCalledWith('t1', {filters: {status: 'open'}});
    expect(store.mock.invocationCallOrder[0]).toBeLessThan(exportData.mock.invocationCallOrder[0]);
  });

  it('tells a cancelled export, and stays open', async () => {
    const {fixture, exportData, toast, close, downloadButton} = await setup();
    exportData.mockRejectedValue({name: 'TimeoutError'});
    downloadButton().click();
    await fixture.whenStable();
    for (let step = 0; step < 3; step++) await new Promise(resolve => setTimeout(resolve));
    expect(toast).toHaveBeenCalledWith('error', expect.stringContaining('taking too long'));
    expect(close).not.toHaveBeenCalled();
  });
});
