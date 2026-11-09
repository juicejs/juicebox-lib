import {Component, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideJuicebarTesting} from '../../../../../testing/juicebar-testing';
import {ConfigurationService} from '../../../shared/services/configuration.service';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {ExportsService} from '../exports.service';
import {ExportsTranslationPipe} from '../i18n/exports.translation';
import {ExportColumn} from '../types/ExportColumn';
import {ExportTemplate, ExportTemplateFormValue} from '../types/ExportTemplate';
import {ExportTemplateEditorComponent} from './export-template-editor.component';

const COLUMNS: ExportColumn[] = [
  {id: 'name', label: 'Name', sortable: true, group: 'Person'},
  {id: 'email', label: 'Email', sortable: false, group: 'Person'},
  {id: 'total', label: 'Total', sortable: true, group: 'Order'},
];

@Component({
  imports: [ExportTemplateEditorComponent],
  template: `<app-export-template-editor [template]="template()" submitLabel="Save" [canSubmit]="true"
                                         (submitted)="sent = $event" />`,
})
class HostComponent {
  template = signal<ExportTemplate | null>(null);
  sent: ExportTemplateFormValue | null = null;
}

describe('ExportTemplateEditorComponent', () => {
  async function setup({template = null as ExportTemplate | null, amg = false} = {}) {
    TestBed.configureTestingModule({imports: [HostComponent], providers: [...provideJuicebarTesting(), ExportsTranslationPipe]});
    const juicebox = TestBed.inject(JuiceboxService);
    vi.spyOn(juicebox, 'getUserId').mockReturnValue('user-1');
    vi.spyOn(juicebox, 'getUserOrganisationId').mockReturnValue('org-1');
    vi.spyOn(TestBed.inject(ConfigurationService), 'getByKey').mockImplementation(async (key: string) =>
      key === 'amgshop' ? {success: amg} : {success: true, payload: {value: 'master-org'}});
    const exports = TestBed.inject(ExportsService);
    vi.spyOn(exports, 'getDataSourceStrategies').mockResolvedValue({success: true, payload: [
      {key: 'orders:strategy', schema: 'exports:data-source', name: 'Orders'},
      {key: 'vendors:strategy', schema: 'exports:data-source', name: 'Vendors'},
    ]});
    vi.spyOn(exports, 'getColumns').mockResolvedValue({success: true, payload: COLUMNS.map(column => ({...column}))});
    vi.spyOn(exports, 'getFilters').mockResolvedValue({success: true, payload: [{id: 'status', label: 'Status', type: 'string'}]});

    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.template.set(template);
    fixture.autoDetectChanges();
    // The editor loads the configuration, data sources, columns and filters one after another
    for (let step = 0; step < 5; step++) await new Promise(resolve => setTimeout(resolve));
    await fixture.whenStable();
    // The test drives the editor's own (protected) handlers, as its template does
    const editor = fixture.debugElement.children[0].componentInstance as any;
    return {fixture, host: fixture.componentInstance, editor};
  }

  it('sends a new template as the old create page did', async () => {
    const {host, editor, fixture} = await setup();
    // Vendors are only for the master organisation
    expect(editor.dataSources().map((source: {key: string}) => source.key)).toEqual(['orders:strategy']);

    editor.templateForm().get('name').setValue('Orders 2026');
    await editor.selectDataSource(editor.dataSources()[0]);
    editor.selectAllColumns();
    editor.templateForm().get(['sort', 'prop']).setValue('total');
    editor.onSortField('total');
    await fixture.whenStable();
    editor.submit();

    expect(host.sent).toEqual({
      name: 'Orders 2026',
      data_source_key: 'orders:strategy',
      columns: ['name', 'email', 'total'],
      filters: {status: null},
      sort: {prop: 'total', dir: 'desc'},
      meta: {user_id: 'user-1', organisation_id: 'org-1'},
    });
  });

  it('opens a template with its columns picked in its order and its filter values', async () => {
    const {editor} = await setup({template: {
      _id: 't1', name: 'Mine', data_source_key: 'orders:strategy', columns: ['total', 'name'],
      filters: [{id: 'status', value: 'paid'}], sort: {prop: 'total', dir: 'asc'}, deleted: false, updated: '',
      _available_export_strategies: [],
    }});
    expect(editor.selectedColumns().map((column: ExportColumn) => column.id)).toEqual(['total', 'name']);
    expect(editor.columns().map((column: ExportColumn) => column.id)).toEqual(['email']);
    expect(editor.filters()[0].value).toBe('paid');
    expect(editor.templateForm().getRawValue().sort).toEqual({prop: 'total', dir: 'asc'});
  });

  it('picking a whole group adds each column once, which the old page didn\'t', async () => {
    const {editor} = await setup({amg: true});
    await editor.selectDataSource(editor.dataSources()[0]);
    editor.toggleGroupColumn('Person', editor.groupColumns()['Person'][0], false);
    editor.selectAllGroupColumns('Person');
    editor.selectAllGroupColumns('Order');
    expect(editor.templateForm().get('columns').value).toEqual(['name', 'email', 'total']);
    expect(editor.sortable().map((column: ExportColumn) => column.id)).toEqual(['name', 'total']);
  });

  it('a column moves to the other list with the keyboard', async () => {
    const {editor} = await setup();
    await editor.selectDataSource(editor.dataSources()[0]);
    editor.toggleColumn(editor.columns()[1], false);
    expect(editor.templateForm().get('columns').value).toEqual(['email']);
    editor.toggleColumn(editor.selectedColumns()[0], true);
    expect(editor.templateForm().get('columns').value).toBeNull();
  });
});
