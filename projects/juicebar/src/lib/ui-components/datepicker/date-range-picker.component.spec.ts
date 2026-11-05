import {Component, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {provideJuicebarTesting} from '../../../testing/juicebar-testing';
import {DateRangePickerComponent} from './date-range-picker.component';
import {DateRange, DateValueFormat} from './date-utils';

@Component({
  imports: [DateRangePickerComponent, ReactiveFormsModule],
  template: `
    <app-date-range-picker [formControl]="control" [valueFormat]="valueFormat()" [startDate]="startDate"
                           (dateSelection)="emitted.push($event)" />
  `,
})
class HostComponent {
  control = new FormControl<unknown>(null);
  valueFormat = signal<DateValueFormat>('timestamp');
  startDate = new Date(2026, 10, 1);
  emitted: (DateRange<unknown> | null)[] = [];
}

describe('DateRangePickerComponent', () => {
  async function setup(configure?: (host: HostComponent) => void) {
    TestBed.configureTestingModule({imports: [HostComponent], providers: provideJuicebarTesting()});
    const fixture = TestBed.createComponent(HostComponent);
    configure?.(fixture.componentInstance);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    const open = async () => {
      input.click();
      await fixture.whenStable();
    };
    const click = async (label: string) => {
      document.querySelector<HTMLButtonElement>(`.app-calendar-day[aria-label="${label}"]`)!.click();
      await fixture.whenStable();
    };
    return {fixture, host: fixture.componentInstance, input, open, click};
  }

  afterEach(() => document.querySelector('.cdk-overlay-container')?.replaceChildren());

  it('sends the old datepicker-range\'s timestamps: first day 00:00:00 to last day 23:59:59', async () => {
    const {host, input, open, click} = await setup();
    await open();
    await click('5. Nov 2026');
    expect(input.value).toBe('05.11.2026');
    expect(host.control.value).toBeNull();
    await click('9. Nov 2026');
    const expected = {from: new Date(2026, 10, 5).getTime(), to: new Date(2026, 10, 9, 23, 59, 59).getTime()};
    expect(host.control.value).toEqual(expected);
    expect(host.emitted).toEqual([expected]);
    expect(input.value).toBe('05.11.2026 – 09.11.2026');
    // As the old one, the panel stays open until a click outside
    expect(document.querySelector('.app-picker-panel')).toBeTruthy();
  });

  it('reads {from, to} in any old shape and clears to null', async () => {
    const {fixture, host, input, open} = await setup(h => h.control.setValue({from: {year: 2026, month: 1, day: 2}, to: '10.01.2026'}));
    expect(input.value).toBe('02.01.2026 – 10.01.2026');
    await open();
    [...document.querySelectorAll<HTMLButtonElement>('.app-picker-footer button')].find(b => b.textContent?.trim() === 'Clear')!.click();
    await fixture.whenStable();
    expect(host.control.value).toBeNull();
    expect(host.emitted).toEqual([null]);
    expect(input.value).toBe('');
  });
});
