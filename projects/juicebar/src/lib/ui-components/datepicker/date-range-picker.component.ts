import {Component, computed, forwardRef, input, output, signal} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {NgTemplateOutlet} from '@angular/common';
import {A11yModule} from '@angular/cdk/a11y';
import {OverlayModule} from '@angular/cdk/overlay';
import {ButtonComponent} from '../button/button.component';
import {DISABLEABLE, Disableable} from '../disableable';
import {CalendarComponent} from './calendar.component';
import {DateRange, DateValueFormat, dayKey, formatDate, toDate, toRangeValue} from './date-utils';
import {PickerAutoClose, PickerField} from './picker-field';

/**
 * A date range field, after the old datepicker-range (cse and mbt orders) and the range calendars: the first day picked
 * starts the range, a later one ends it, any other starts again; the days in between and up to the hovered day are marked.
 * The field shows the range and opens the calendar, whose footer has Clear. The form gets `{from, to}` in `valueFormat`
 * once both days are picked, null when cleared; `timestamp` gives the old datepicker-range's milliseconds from the first
 * day's 00:00:00 to the last day's 23:59:59. `dateSelection` emits the same, as the old component's output did.
 */
@Component({
  selector: 'app-date-range-picker',
  templateUrl: './date-range-picker.component.html',
  styleUrl: './picker-field.scss',
  imports: [OverlayModule, A11yModule, NgTemplateOutlet, ButtonComponent, CalendarComponent],
  host: {
    'class': 'app-date-range-picker',
    '[class.has-value]': '!!to()',
  },
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => DateRangePickerComponent),
    multi: true,
  }, {
    provide: DISABLEABLE,
    useExisting: forwardRef(() => DateRangePickerComponent),
  }],
})
export class DateRangePickerComponent extends PickerField implements ControlValueAccessor, Disableable {
  /** The shape of `from` and `to`, see `DateValueFormat`; by default the old datepicker-range's milliseconds */
  valueFormat = input<DateValueFormat>('timestamp');
  clearLabel = input('Clear');

  /** The range was picked, or cleared (null); the old datepicker-range's output */
  dateSelection = output<DateRange<unknown> | null>();

  /** As the old datepicker-range: the panel stays open until a click outside it */
  protected readonly defaultAutoClose: PickerAutoClose = 'outside';

  protected readonly from = signal<Date | null>(null);
  protected readonly to = signal<Date | null>(null);
  protected readonly range = computed(() => ({from: this.from(), to: this.to()}));
  /** Also the first day alone while the last one is being picked, as the old field showed it */
  protected readonly text = computed(() => {
    const from = this.from();
    const to = this.to();
    return from ? `${formatDate(from)}${to ? ` – ${formatDate(to)}` : ''}` : '';
  });

  private onChange: (value: unknown) => void = () => {};

  protected onDateSelect(date: Date): void {
    const from = this.from();
    if (from && !this.to() && dayKey(date) > dayKey(from)) {
      this.to.set(date);
      const value = toRangeValue(from, date, this.valueFormat());
      this.onChange(value);
      this.dateSelection.emit(value);
      this.closeAfterPick();
    } else {
      this.from.set(date);
      this.to.set(null);
    }
  }

  clear(): void {
    this.from.set(null);
    this.to.set(null);
    this.onChange(null);
    this.onTouched();
    this.dateSelection.emit(null);
    this.close(true);
  }

  writeValue(value: unknown): void {
    const range = value as Partial<DateRange<unknown>> | null;
    this.from.set(toDate(range?.from));
    this.to.set(toDate(range?.to));
  }

  registerOnChange(fn: (value: unknown) => void): void { this.onChange = fn; }
}
