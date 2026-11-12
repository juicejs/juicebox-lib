import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataTableComponent } from './data-table.component';
import { CellDefDirective, CompactRowDefDirective, HeaderDefDirective } from './cell-def.directive';
import { ColumnConfig, SortState } from './data-table.types';
import { ViewportService } from '../viewport/viewport.service';

interface Person {
  _id: string;
  first: string;
  last: string;
  email: string;
  city: string;
  country: string;
  notes: string;
}

@Component({
  imports: [DataTableComponent, CellDefDirective, CompactRowDefDirective, HeaderDefDirective],
  template: `
    <app-data-table [rows]="rows()" [columns]="columns()" [sort]="sort()" [selectable]="selectable()"
                    selectAriaLabel="Select person"
                    (sortChange)="sorted = $event" (rowClick)="clicked = $event" (selectionChange)="selected = $event">
      @if (withRowDef()) {
        <ng-template compactRowDef let-row>
          <span class="dt-list-title">{{ row.first }} {{ row.last }}</span>
        </ng-template>
      }
      <ng-template [headerDef]="'city'">
        <input class="city-filter" type="text" aria-label="City">
      </ng-template>
      @if (withActions()) {
        <ng-template [cellDef]="'actions'" let-row>
          <button type="button" class="row-action" (click)="$event.stopPropagation()">Delete</button>
        </ng-template>
        <ng-template [cellDef]="'tools'" let-row>
          <button type="button" class="row-tool" (click)="$event.stopPropagation()">Open</button>
        </ng-template>
      }
    </app-data-table>
  `,
})
class HostComponent {
  rows = signal<Person[]>([
    { _id: '1', first: 'Ana', last: 'Horvat', email: 'ana@example.test', city: 'Pula', country: 'Croatia', notes: 'One' },
    { _id: '2', first: 'Ivo', last: 'Babić', email: 'ivo@example.test', city: 'Rijeka', country: 'Croatia', notes: 'Two' },
  ]);
  columns = signal<ColumnConfig[]>([]);
  sort = signal<SortState>({ prop: '', dir: '' });
  withRowDef = signal(false);
  withActions = signal(true);
  selectable = signal(false);
  sorted: SortState | null = null;
  clicked: unknown = null;
  selected: unknown = null;
}

describe('DataTableComponent', () => {
  const phone = signal(false);
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let element: HTMLElement;

  const all = <T extends Element>(selector: string) => Array.from(element.querySelectorAll<T>(selector));
  /** The first row's fields in the order they stand, each with the places it takes in its line */
  const fields = () => all<HTMLElement>('.dt-card:first-child .dt-card-field')
    .map(field => `${field.querySelector('dt')?.textContent?.trim()} (${field.style.getPropertyValue('grid-column')})`);

  beforeEach(() => {
    phone.set(false);
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: ViewportService, useValue: { phone } }],
    });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    element = fixture.nativeElement;
  });

  function show(columns: ColumnConfig[]) {
    host.columns.set(columns);
    fixture.detectChanges();
  }

  it('is a table on a wide screen', () => {
    show([{ key: 'first', label: 'First name' }, { key: 'city', label: 'City' }]);

    expect(element.querySelector('table.data-table')).toBeTruthy();
    expect(all('.dt-card').length).toBe(0);
  });

  it('names a row checkbox for screen readers', () => {
    host.selectable.set(true);
    show([{ key: 'first', label: 'First name' }]);

    expect(element.querySelector('table [role="checkbox"]')?.getAttribute('aria-label')).toBe('Select person');
  });

  it('keeps what is typed in a header filter when the screen crosses the phone width', async () => {
    show([{ key: 'first', label: 'First name' }, { key: 'city', label: 'City' }]);
    const typed = element.querySelector<HTMLInputElement>('th .city-filter')!;
    typed.value = 'Pu';

    phone.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const filter = element.querySelector<HTMLInputElement>('.dt-cards-filter .city-filter')!;
    expect(filter).not.toBe(typed);
    expect(filter.value).toBe('Pu');

    filter.value = 'Pul';
    phone.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(element.querySelector<HTMLInputElement>('th .city-filter')!.value).toBe('Pul');
  });

  describe('on a phone', () => {
    beforeEach(() => phone.set(true));

    it('shows each row as its name, its other columns as fields and its actions', () => {
      show([
        { key: 'first', label: 'First name' },
        { key: 'city', label: 'City' },
        { key: 'country', label: 'Country' },
        { key: 'actions', label: 'Actions' },
      ]);

      expect(element.querySelector('table.data-table')).toBeNull();
      expect(all('.dt-card').length).toBe(2);
      expect(element.querySelector('.dt-card .dt-card-name')?.textContent?.trim()).toBe('Ana');
      expect(fields()).toEqual(['City (span 1)', 'Country (span 1)']);
      expect(all('.dt-card:first-child .dt-card-actions .row-action').length).toBe(1);
    });

    it('opens a row when it is clicked, but not from its actions', () => {
      show([{ key: 'first', label: 'First name' }, { key: 'actions', label: 'Actions' }]);

      element.querySelector<HTMLElement>('.dt-card .row-action')!.click();
      expect(host.clicked).toBeNull();

      element.querySelector<HTMLElement>('.dt-card .dt-card-name')!.click();
      expect(host.clicked).toBe(host.rows()[0]);
    });

    it('names a row with the compactRowDef template and leaves out the columns it shows', () => {
      host.withRowDef.set(true);
      show([
        { key: 'first', label: 'First name', inCompactRow: true },
        { key: 'last', label: 'Last name', inCompactRow: true },
        { key: 'city', label: 'City' },
      ]);

      expect(element.querySelector('.dt-card .dt-card-name')?.textContent?.trim()).toBe('Ana Horvat');
      expect(fields()).toEqual(['City (span 1)']);
    });

    it('takes the name and the actions from the columns that say so', () => {
      show([
        { key: 'country', label: 'Country' },
        { key: 'last', label: 'Last name', listRole: 'name' },
        { key: 'tools', label: 'Tools', listRole: 'actions' },
      ]);

      expect(element.querySelector('.dt-card .dt-card-name')?.textContent?.trim()).toBe('Horvat');
      expect(fields()).toEqual(['Country (span 1)']);
      expect(all('.dt-card:first-child .dt-card-actions .row-tool').length).toBe(1);
    });

    it('shows an actions column without a cell template as a field', () => {
      host.withActions.set(false);
      show([{ key: 'first', label: 'First name' }, { key: 'actions', label: 'Actions' }]);

      expect(element.querySelector('.dt-card-actions')).toBeNull();
      expect(fields()).toEqual(['Actions (span 1)']);
    });

    it('selects a row with its checkbox, without opening it', () => {
      host.selectable.set(true);
      show([{ key: 'first', label: 'First name' }, { key: 'city', label: 'City' }]);
      const checkbox = () => element.querySelector<HTMLElement>('.dt-card .dt-card-select [role="checkbox"]')!;

      expect(checkbox().getAttribute('aria-label')).toBe('Select person');
      checkbox().click();
      fixture.detectChanges();

      expect(host.selected).toBe(host.rows()[0]);
      expect(host.clicked).toBeNull();
      expect(element.querySelector('.dt-card')?.classList).toContain('dt-card--selected');
      expect(checkbox().getAttribute('aria-checked')).toBe('true');
    });

    it('says that there are no rows outside the list', () => {
      host.rows.set([]);
      show([{ key: 'first', label: 'First name' }]);

      expect(element.querySelector('[role="list"]')).toBeNull();
      expect(element.querySelector('.dt-list-empty')?.textContent?.trim()).toBe('No data to display');
    });

    it('gives one field the whole line', () => {
      show([{ key: 'first', label: 'First name' }, { key: 'notes', label: 'Notes' }]);

      expect(fields()).toEqual(['Notes (span 1)']);
      expect(element.querySelector<HTMLElement>('.dt-card-fields')!.style.getPropertyValue('--dt-card-fields-per-line')).toBe('1');
    });

    it('puts three fields in a line and gives the last one the room that is left', () => {
      show([
        { key: 'first', label: 'First name' },
        { key: 'last', label: 'Last name' },
        { key: 'email', label: 'Email' },
        { key: 'city', label: 'City' },
        { key: 'country', label: 'Country' },
      ]);

      expect(fields()).toEqual(['Last name (span 1)', 'Email (span 1)', 'City (span 1)', 'Country (span 3)']);
    });

    it('gives a wide column two places, fills the gap before it and keeps the fields in the order they are seen', () => {
      show([
        { key: 'first', label: 'First name' },
        { key: 'last', label: 'Last name', width: '100px' },
        { key: 'city', label: 'City' },
        { key: 'notes', label: 'Notes', width: '220px' },
        { key: 'country', label: 'Country' },
        { key: 'email', label: 'Email' },
      ]);

      // Notes doesn't fit the first line any more, Country does: the first line is full before Notes starts the second
      expect(fields()).toEqual([
        'Last name (span 1)', 'City (span 1)', 'Country (span 1)', 'Notes (span 2)', 'Email (span 1)',
      ]);
    });

    it('sorts from the control above the rows as a click on a header does', async () => {
      show([
        { key: 'first', label: 'First name', sortable: true },
        { key: 'city', label: 'City', sortable: true },
        { key: 'country', label: 'Country' },
      ]);
      const sortOptions = () => Array.from(document.querySelectorAll<HTMLElement>('.dt-cards-sort-option'));
      const openSort = async () => {
        element.querySelector<HTMLElement>('.dt-cards-sort')!.click();
        fixture.detectChanges();
        await fixture.whenStable();
      };

      await openSort();
      expect(sortOptions().map(option => option.textContent?.trim())).toEqual(['First name', 'City']);
      sortOptions()[1].click();
      fixture.detectChanges();
      expect(host.sorted).toEqual({ prop: 'city', dir: 'asc' });

      // The column the rows are sorted by: the other direction
      host.sort.set({ prop: 'city', dir: 'asc' });
      fixture.detectChanges();
      expect(element.querySelector('.dt-cards-sort')?.textContent).toContain('City');
      await openSort();
      sortOptions().find(option => option.textContent?.includes('City'))!.click();
      fixture.detectChanges();
      expect(host.sorted).toEqual({ prop: 'city', dir: 'desc' });
    });
  });
});
