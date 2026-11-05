import {Component, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {provideJuicebarTesting} from '../../../testing/juicebar-testing';
import {CalendarComponent, CalendarOutsideDays, CalendarSelectionMode} from './calendar.component';
import {DateValueFormat} from './date-utils';

@Component({
  imports: [CalendarComponent, ReactiveFormsModule],
  template: `
    <app-calendar [formControl]="control" [selectionMode]="mode()" [valueFormat]="valueFormat()"
                  [displayMonths]="displayMonths()" [outsideDays]="outsideDays()" [showWeekNumbers]="weekNumbers()"
                  [startDate]="startDate" [dayTemplate]="useTemplate() ? dayTemplate : null"
                  (dateSelect)="selected.push($event)" />
    <ng-template #dayTemplate let-date let-inRange="inRange">
      <span class="custom-day" [class.vacation]="date.getDate() === 24">{{ date.getDate() }}</span>
    </ng-template>
  `,
})
class HostComponent {
  control = new FormControl<unknown>(null);
  mode = signal<CalendarSelectionMode>('single');
  valueFormat = signal<DateValueFormat>('date');
  displayMonths = signal(1);
  outsideDays = signal<CalendarOutsideDays>('visible');
  weekNumbers = signal(false);
  useTemplate = signal(false);
  startDate = new Date(2026, 10, 1);
  selected: Date[] = [];
}

describe('CalendarComponent (inline)', () => {
  async function setup(configure?: (host: HostComponent) => void) {
    TestBed.configureTestingModule({imports: [HostComponent], providers: provideJuicebarTesting()});
    const fixture = TestBed.createComponent(HostComponent);
    configure?.(fixture.componentInstance);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const day = (label: string) => element.querySelector<HTMLButtonElement>(`.app-calendar-day[aria-label="${label}"]`)!;
    const click = async (label: string) => {
      day(label).click();
      await fixture.whenStable();
    };
    return {fixture, host: fixture.componentInstance, element, day, click};
  }

  it('is a form control in the chosen format and emits dateSelect', async () => {
    const {host, click} = await setup(h => h.valueFormat.set('struct'));
    await click('12. Nov 2026');
    expect(host.control.value).toEqual({year: 2026, month: 11, day: 12});
    expect(host.selected).toEqual([new Date(2026, 10, 12)]);
  });

  it('picks a range as the old range pickers: start, later end, any other click starts again', async () => {
    const {host, element, day, click} = await setup(h => h.mode.set('range'));
    await click('10. Nov 2026');
    expect(host.control.value).toBeNull();
    // A day before the start starts again
    await click('5. Nov 2026');
    await click('8. Nov 2026');
    expect(host.control.value).toEqual({from: new Date(2026, 10, 5), to: new Date(2026, 10, 8, 23, 59, 59)});
    expect(day('5. Nov 2026').classList).toContain('app-calendar-day-selected');
    expect(day('8. Nov 2026').classList).toContain('app-calendar-day-selected');
    expect(day('5. Nov 2026').parentElement!.classList).toContain('app-calendar-band-start');
    expect(day('8. Nov 2026').parentElement!.classList).toContain('app-calendar-band-end');
    expect(element.querySelectorAll('.app-calendar-day-in-range').length).toBe(2);
    // A click on a complete range starts a new one
    await click('20. Nov 2026');
    expect(element.querySelectorAll('.app-calendar-band-end').length).toBe(0);
  });

  it('marks the days up to the hovered one while the end is picked', async () => {
    const {fixture, element, day, click} = await setup(h => h.mode.set('range'));
    await click('10. Nov 2026');
    day('13. Nov 2026').dispatchEvent(new MouseEvent('mouseenter'));
    await fixture.whenStable();
    expect([...element.querySelectorAll('.app-calendar-day-in-range')].map(d => d.textContent?.trim())).toEqual(['11', '12', '13']);
  });

  it('shows two months, week numbers and hides the other months\' days', async () => {
    const {element} = await setup(h => {
      h.displayMonths.set(2);
      h.weekNumbers.set(true);
      h.outsideDays.set('hidden');
    });
    expect([...element.querySelectorAll('.app-calendar-month-title')].map(t => t.textContent?.trim())).toEqual(['Nov 2026', 'Dec 2026']);
    // 1 Nov 2026 is a Sunday in ISO week 44; the first grid row has only that day
    const firstRow = element.querySelector('.app-calendar-days tbody tr')!;
    expect(firstRow.querySelector('.app-calendar-week-number')?.textContent?.trim()).toBe('44');
    expect(firstRow.querySelectorAll('.app-calendar-day').length).toBe(1);
  });

  it('draws the days with a dayTemplate', async () => {
    const {element} = await setup(h => h.useTemplate.set(true));
    expect(element.querySelector('.app-calendar-day[aria-label="24. Nov 2026"] .custom-day.vacation')).toBeTruthy();
  });

  it('keeps the months shown when a day in the second month is picked', async () => {
    const {element, click} = await setup(h => h.displayMonths.set(2));
    await click('10. Dec 2026');
    expect(element.querySelector('.app-calendar-title')?.textContent?.trim()).toBe('Nov 2026');
  });
});
