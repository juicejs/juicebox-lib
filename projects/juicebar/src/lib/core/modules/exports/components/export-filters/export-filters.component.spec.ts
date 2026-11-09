import {Component, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {FormGroup} from '@angular/forms';
import {EXPORTS_CUSTOMIZATION} from '../../../../../config/base-app.config';
import {provideJuicebarTesting} from '../../../../../../testing/juicebar-testing';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {ExportsTranslationPipe} from '../../i18n/exports.translation';
import {ExportFilter} from '../../types/ExportFilter';
import {ExportFiltersComponent} from './export-filters.component';
import {exportFilterValues} from './export-filter-values';

const status: ExportFilter = {id: 'status', label: 'Status', type: 'string', value: 'paid'};
const modules: ExportFilter = {id: 'show_modules', label: 'Modules', type: 'string', value: 'mine'};

@Component({
  imports: [ExportFiltersComponent],
  template: `<app-export-filters [filters]="filters()" (filtersValueChange)="form = $event" />`,
})
class HostComponent {
  filters = signal<ExportFilter[]>([status, modules]);
  form: FormGroup | null = null;
}

describe('ExportFiltersComponent', () => {
  async function setup(permissions: string[] = []) {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        ...provideJuicebarTesting(),
        ExportsTranslationPipe,
        {provide: EXPORTS_CUSTOMIZATION, useValue: {options: {
          hiddenFilters: [{filter: 'show_modules', permission: 'modules:role#mine-only', unless: 'modules:role#super-admin'}],
        }}},
      ],
    });
    vi.spyOn(TestBed.inject(JuiceboxService), 'hasPermission').mockImplementation(permission => permissions.includes(permission));
    const fixture = TestBed.createComponent(HostComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    return {fixture, host: fixture.componentInstance, element: fixture.nativeElement as HTMLElement};
  }

  it('emits the filter form with the stored values', async () => {
    const {host} = await setup();
    expect(exportFilterValues(host.form!)).toEqual({status: 'paid', show_modules: 'mine'});
  });

  it('a data source without filters clears the previous one\'s values, which the old form kept', async () => {
    const {host, fixture} = await setup();
    host.filters.set([]);
    await fixture.whenStable();
    expect(exportFilterValues(host.form!)).toEqual({});
  });

  it('hides a filter from mine-only users, as QC does, and keeps its value', async () => {
    const {host, element} = await setup(['modules:role#mine-only']);
    expect(element.querySelectorAll('.filter-item').length).toBe(1);
    expect(element.textContent).not.toContain('Modules');
    expect(exportFilterValues(host.form!)).toEqual({status: 'paid', show_modules: 'mine'});
  });

  it('shows it to super admins', async () => {
    const {element} = await setup(['modules:role#mine-only', 'modules:role#super-admin']);
    expect(element.querySelectorAll('.filter-item').length).toBe(2);
  });
});
