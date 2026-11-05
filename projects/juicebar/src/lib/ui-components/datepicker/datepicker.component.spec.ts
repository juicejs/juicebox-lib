import {Component, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {provideJuicebarTesting} from '../../../testing/juicebar-testing';
import {DatepickerComponent} from './datepicker.component';
import {DateValueFormat} from './date-utils';

@Component({
  imports: [DatepickerComponent, ReactiveFormsModule],
  template: `
    <app-datepicker [formControl]="control" [minDate]="minDate()" [maxDate]="maxDate()" [valueFormat]="valueFormat()"
                    [clearable]="true" [markDisabled]="markDisabled" (dateSelect)="picked = $event" />
  `,
})
class HostComponent {
  control = new FormControl<unknown>(null);
  minDate = signal<Date | null>(null);
  maxDate = signal<Date | null>(null);
  valueFormat = signal<DateValueFormat>('date');
  markDisabled: ((date: Date) => boolean) | null = null;
  picked: Date | null = null;
}

describe('DatepickerComponent', () => {
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
    const day = (label: string) =>
      document.querySelector<HTMLButtonElement>(`.app-calendar-day[aria-label="${label}"]`)!;
    return {fixture, host: fixture.componentInstance, input, type, open, day};
  }

  afterEach(() => document.querySelector('.cdk-overlay-container')?.replaceChildren());

  it('shows the value as DD.MM.YYYY, also the old {year, month, day}', async () => {
    const {fixture, host, input} = await setup(h => h.control.setValue(new Date(2026, 10, 5)));
    expect(input.value).toBe('05.11.2026');
    host.control.setValue({year: 2020, month: 3, day: 15});
    await fixture.whenStable();
    expect(input.value).toBe('15.03.2020');
  });

  it('takes a typed date as a Date and shows it in the full format', async () => {
    const {host, input, type} = await setup();
    await type('5.1.2026');
    expect(host.control.value).toEqual(new Date(2026, 0, 5));
    expect(host.control.valid).toBe(true);
    expect(input.value).toBe('05.01.2026');
  });

  it('gives ngb\'s ngbDate error for text that is no date', async () => {
    const {host, type} = await setup();
    await type('31.02.2026');
    // As ngb: the text itself is the value
    expect(host.control.value).toBe('31.02.2026');
    expect(host.control.errors).toEqual({ngbDate: {invalid: '31.02.2026'}});
    await type('');
    expect(host.control.value).toBeNull();
    expect(host.control.errors).toBeNull();
  });

  it('gives ngbDate minDate/maxDate errors and checks again when they change', async () => {
    const {fixture, host, type} = await setup(h => h.minDate.set(new Date(2026, 0, 10)));
    await type('09.01.2026');
    expect(host.control.hasError('ngbDate')).toBe(true);
    expect(host.control.errors?.['ngbDate'].minDate).toBeTruthy();
    host.minDate.set(null);
    await fixture.whenStable();
    expect(host.control.errors).toBeNull();
    host.maxDate.set(new Date(2026, 0, 8));
    await fixture.whenStable();
    expect(host.control.errors?.['ngbDate'].maxDate).toBeTruthy();
  });

  it('picks a day in the calendar, emits dateSelect and closes', async () => {
    const {fixture, host, input, open, day} = await setup(h => h.control.setValue(new Date(2026, 10, 5)));
    await open();
    day('20. Nov 2026').click();
    await fixture.whenStable();
    expect(host.control.value).toEqual(new Date(2026, 10, 20));
    expect(host.picked).toEqual(new Date(2026, 10, 20));
    expect(input.value).toBe('20.11.2026');
    expect(document.querySelector('.app-picker-panel')).toBeNull();
  });

  it('can\'t pick days outside minDate/maxDate or marked disabled', async () => {
    const {fixture, host, open, day} = await setup(h => {
      h.control.setValue(new Date(2026, 10, 15));
      h.minDate.set(new Date(2026, 10, 10));
      h.maxDate.set(new Date(2026, 10, 20));
      h.markDisabled = date => date.getDay() === 0;
    });
    await open();
    expect(day('9. Nov 2026').getAttribute('aria-disabled')).toBe('true');
    expect(day('21. Nov 2026').getAttribute('aria-disabled')).toBe('true');
    expect(day('15. Nov 2026').getAttribute('aria-disabled')).toBe('true');
    expect(day('16. Nov 2026').getAttribute('aria-disabled')).toBeNull();
    // The month arrows stop at minDate and maxDate
    const arrows = document.querySelectorAll<HTMLButtonElement>('.app-calendar-arrow');
    expect(arrows[0].disabled).toBe(true);
    expect(arrows[1].disabled).toBe(true);
    day('9. Nov 2026').click();
    await fixture.whenStable();
    expect(host.control.value).toEqual(new Date(2026, 10, 15));
  });

  it('moves with ngb\'s keys: arrows by day and week, PageDown by month', async () => {
    const {fixture, open} = await setup(h => h.control.setValue(new Date(2026, 10, 5)));
    await open();
    const grid = document.querySelector('.app-calendar-days')!;
    const press = async (key: string) => {
      grid.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles: true}));
      await fixture.whenStable();
    };
    const focusedLabel = () => document.querySelector('.app-calendar-day[tabindex="0"]')?.getAttribute('aria-label');
    await press('ArrowRight');
    expect(focusedLabel()).toBe('6. Nov 2026');
    await press('ArrowDown');
    expect(focusedLabel()).toBe('13. Nov 2026');
    await press('PageDown');
    expect(focusedLabel()).toBe('13. Dec 2026');
  });

  it('gives the form the old shapes: {year, month, day}, DD.MM.YYYY or a timestamp', async () => {
    const {fixture, host, type} = await setup(h => h.valueFormat.set('struct'));
    await type('05.11.2026');
    expect(host.control.value).toEqual({year: 2026, month: 11, day: 5});
    host.valueFormat.set('string');
    await fixture.whenStable();
    await type('06.11.2026');
    expect(host.control.value).toBe('06.11.2026');
    host.valueFormat.set('timestamp');
    await fixture.whenStable();
    await type('07.11.2026');
    expect(host.control.value).toBe(new Date(2026, 10, 7).getTime());
  });

  it('reads a timestamp and a DD.MM.YYYY string', async () => {
    const {fixture, host, input} = await setup(h => h.control.setValue(new Date(2026, 10, 5).getTime()));
    expect(input.value).toBe('05.11.2026');
    host.control.setValue('24.12.2025');
    await fixture.whenStable();
    expect(input.value).toBe('24.12.2025');
  });

  it('empties the field with the clear button', async () => {
    const {fixture, host, input} = await setup(h => h.control.setValue(new Date(2026, 10, 5)));
    (fixture.nativeElement.querySelector('.app-picker-clear') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(host.control.value).toBeNull();
    expect(input.value).toBe('');
    expect(fixture.nativeElement.querySelector('.app-picker-clear')).toBeNull();
  });
});
