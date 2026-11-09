import {exportErrorKey, isFailedExport} from './exports-shared';

describe('exports shared', () => {
  it('takes a small JSON answer with an error, or an error text, for a failed export', async () => {
    expect(await isFailedExport(new Blob(['{"success":false}']))).toBe(true);
    expect(await isFailedExport(new Blob(['{"success":false,"error":"missing_data"}']))).toBe(true);
    expect(await isFailedExport(new Blob(['Error: export_template_does_not_exist']))).toBe(true);
  });

  it('downloads a small file that is no JSON, which the old dialogs refused', async () => {
    // A zip (PDF export) starts with PK and may contain commas, as the old check wanted
    expect(await isFailedExport(new Blob(['PK\u0003\u0004 small zip, with commas']))).toBe(false);
    expect(await isFailedExport(new Blob(['PK\u0003\u0004 small zip without']))).toBe(false);
    expect(await isFailedExport(new Blob([new Uint8Array(5000)]))).toBe(false);
  });

  it('tells a cancelled download apart', () => {
    expect(exportErrorKey({name: 'TimeoutError'})).toBe('export_timeout');
    expect(exportErrorKey(new Error('500'))).toBe('download_failed');
    expect(exportErrorKey(null)).toBe('download_failed');
  });
});
