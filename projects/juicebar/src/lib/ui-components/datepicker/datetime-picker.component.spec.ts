import {Component, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {provideJuicebarTesting} from '../../../testing/juicebar-testing';
import {DatetimePickerComponent} from './datetime-picker.component';
import {DateTimeValueFormat, toIsoWithOffset} from './date-utils';

@Component({
  imports: [DatetimePickerComponent, ReactiveFormsModule],
  template: `<app-datetime-picker [formControl]="control" [valueFormat]="valueFormat()" />`,
})
class HostComponent {
  control = new FormControl<unknown>(null);
  valueFormat = signal<DateTimeValueFormat>('date');
}

describe('DatetimePickerComponent', () => {
  async function setup(configure?: (host: HostComponent) => void) {
    TestBed.configureTestingModule({imports: [HostComponent], providers: provideJuicebarTesting()});
    const fixture = TestBed.createComponent(HostComponent);
    configure?.(fixture.componentInstance);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    const type = async (text: string) => {
      input.value = text;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('change'));
      await fixture.whenStable();
    };
    const open = async () => {
      (fixture.nativeElement.querySelector('.app-picker-toggle') as HTMLButtonElement).click();
      await fixture.whenStable();
    };
    const footerButton = (label: string) =>
      [...document.querySelectorAll<HTMLButtonElement>('.app-picker-footer button')].find(b => b.textContent?.trim() === label)!;
    return {fixture, host: fixture.componentInstance, input, type, open, footerButton};
  }

  afterEach(() => document.querySelector('.cdk-overlay-container')?.replaceChildren());

  it('takes a typed DD.MM.YYYY HH:mm and sends the old ISO string with the offset', async () => {
    const {host, type} = await setup(h => h.valueFormat.set('iso'));
    await type('05.11.2026 14:30');
    expect(host.control.value).toBe(toIsoWithOffset(new Date(2026, 10, 5, 14, 30)));
    expect(String(host.control.value)).toMatch(/^2026-11-05T14:30:00[+-]\d{2}:\d{2}$/);
  });

  it('keeps the time when another day is picked and the day when the time changes', async () => {
    const {fixture, host, input, open} = await setup(h => h.control.setValue(new Date(2026, 10, 5, 9, 15)));
    expect(input.value).toBe('05.11.2026 09:15');
    await open();
    document.querySelector<HTMLButtonElement>('.app-calendar-day[aria-label="20. Nov 2026"]')!.click();
    await fixture.whenStable();
    expect(host.control.value).toEqual(new Date(2026, 10, 20, 9, 15));
    // The panel stays open for the time
    const minutes = document.querySelector<HTMLInputElement>('.app-timepicker-input[aria-label="Minutes"]')!;
    minutes.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowUp'}));
    await fixture.whenStable();
    expect(host.control.value).toEqual(new Date(2026, 10, 20, 9, 30));
  });

  it('Today sets today at the current time and Clear empties it', async () => {
    const {fixture, host, open, footerButton} = await setup();
    await open();
    footerButton('Today').click();
    await fixture.whenStable();
    const value = host.control.value as Date;
    const now = new Date();
    expect(value.toDateString()).toBe(now.toDateString());
    expect(value.getHours()).toBe(now.getHours());
    await open();
    footerButton('Clear').click();
    await fixture.whenStable();
    expect(host.control.value).toBeNull();
  });

  it('gives the ngbDate error for text that is no date and time', async () => {
    const {host, type} = await setup();
    await type('05.11.2026 25:00');
    expect(host.control.errors).toEqual({ngbDate: {invalid: '05.11.2026 25:00'}});
  });
});
