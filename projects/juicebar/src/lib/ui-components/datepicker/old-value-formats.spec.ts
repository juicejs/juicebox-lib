import {Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {provideJuicebarTesting} from '../../../testing/juicebar-testing';
import {TimepickerComponent} from '../timepicker/timepicker.component';
import {CalendarComponent} from './calendar.component';
import {DateRangePickerComponent} from './date-range-picker.component';
import {DatepickerComponent} from './datepicker.component';
import {DatetimePickerComponent} from './datetime-picker.component';

/** Without a valueFormat every control sends the backend what the old juicebox control sent */
@Component({
  imports: [ReactiveFormsModule, CalendarComponent, DatepickerComponent, DateRangePickerComponent, DatetimePickerComponent, TimepickerComponent],
  template: `
    <app-datepicker class="date" [formControl]="date" />
    <app-calendar class="inline" [formControl]="inline" startDate="2026-11-01" />
    <app-date-range-picker class="range" [formControl]="range" startDate="2026-11-01" />
    <app-datetime-picker class="datetime" [formControl]="dateTime" />
    <app-timepicker class="time" [formControl]="time" />
  `,
})
class HostComponent {
  date = new FormControl<unknown>(null);
  inline = new FormControl<unknown>(null);
  range = new FormControl<unknown>(null);
  dateTime = new FormControl<unknown>(null);
  time = new FormControl<unknown>(null);
}

describe('date controls send the old juicebox values by default', () => {
  async function setup() {
    TestBed.configureTestingModule({imports: [HostComponent], providers: provideJuicebarTesting()});
    const fixture = TestBed.createComponent(HostComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const type = async (selector: string, text: string) => {
      const input = element.querySelector<HTMLInputElement>(selector)!;
      input.value = text;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('change'));
      await fixture.whenStable();
    };
    const click = async (root: ParentNode, label: string) => {
      root.querySelector<HTMLButtonElement>(`.app-calendar-day[aria-label="${label}"]`)!.click();
      await fixture.whenStable();
    };
    return {fixture, host: fixture.componentInstance, element, type, click};
  }

  afterEach(() => document.querySelector('.cdk-overlay-container')?.replaceChildren());

  it('app-datepicker: ngb\'s {year, month, day}', async () => {
    const {host, type} = await setup();
    await type('.date input', '05.11.2026');
    expect(host.date.value).toEqual({year: 2026, month: 11, day: 5});
  });

  it('app-calendar: ngb\'s {year, month, day}', async () => {
    const {host, element, click} = await setup();
    await click(element.querySelector('.inline')!, '12. Nov 2026');
    expect(host.inline.value).toEqual({year: 2026, month: 11, day: 12});
  });

  it('app-date-range-picker: the old datepicker-range\'s {from, to} milliseconds', async () => {
    const {host, element, fixture, click} = await setup();
    element.querySelector<HTMLInputElement>('.range input')!.click();
    await fixture.whenStable();
    const panel = document.querySelector('.app-picker-panel')!;
    await click(panel, '5. Nov 2026');
    await click(panel, '9. Nov 2026');
    expect(host.range.value).toEqual({from: new Date(2026, 10, 5).getTime(), to: new Date(2026, 10, 9, 23, 59, 59).getTime()});
  });

  it('app-datetime-picker: the old app-date-and-time-picker\'s ISO string with the offset', async () => {
    const {host, type} = await setup();
    await type('.datetime input', '05.11.2026 14:30');
    expect(host.dateTime.value).toMatch(/^2026-11-05T14:30:00[+-]\d{2}:\d{2}$/);
  });

  it('app-timepicker: ngb\'s {hour, minute, second}', async () => {
    const {host, type} = await setup();
    await type('.time .app-timepicker-input[aria-label="Hours"]', '9');
    await type('.time .app-timepicker-input[aria-label="Minutes"]', '5');
    expect(host.time.value).toEqual({hour: 9, minute: 5, second: 0});
  });
});
