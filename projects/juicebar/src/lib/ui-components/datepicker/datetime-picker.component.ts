import {Component, computed, forwardRef, input, output, signal} from '@angular/core';
import {
  AbstractControl, ControlValueAccessor, FormsModule, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator,
} from '@angular/forms';
import {NgTemplateOutlet} from '@angular/common';
import {A11yModule} from '@angular/cdk/a11y';
import {OverlayModule} from '@angular/cdk/overlay';
import {ButtonComponent} from '../button/button.component';
import {DISABLEABLE, Disableable} from '../disableable';
import {TimepickerComponent} from '../timepicker/timepicker.component';
import {CalendarComponent} from './calendar.component';
import {DateTimeValueFormat, TimeStruct, formatDate, formatTime, parseTypedDate, toDate, toDateTimeValue} from './date-utils';
import {PickerAutoClose, PickerField} from './picker-field';

/**
 * A date and time field, after the old app-date-and-time-picker, datetimepicker and the date fields with a time in their
 * calendar footer: typed as DD.MM.YYYY HH:mm, or picked in the panel's calendar and time with Clear, Today (today at the
 * current time) and Done. The form gets it in `valueFormat`; the control reads a Date, a timestamp or an ISO string.
 * Typed text that is no date and time, or a day outside minDate/maxDate, gives ngb's `ngbDate` error.
 */
@Component({
  selector: 'app-datetime-picker',
  templateUrl: './datetime-picker.component.html',
  styleUrl: './picker-field.scss',
  imports: [OverlayModule, A11yModule, NgTemplateOutlet, FormsModule, ButtonComponent, CalendarComponent, TimepickerComponent],
  host: {
    'class': 'app-datetime-picker',
    '[class.has-value]': '!!value()',
  },
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => DatetimePickerComponent),
    multi: true,
  }, {
    provide: NG_VALIDATORS,
    useExisting: forwardRef(() => DatetimePickerComponent),
    multi: true,
  }, {
    provide: DISABLEABLE,
    useExisting: forwardRef(() => DatetimePickerComponent),
  }],
})
export class DatetimePickerComponent extends PickerField implements ControlValueAccessor, Validator, Disableable {
  /** The form value's shape, see `DateTimeValueFormat`; by default the old app-date-and-time-picker's ISO string */
  valueFormat = input<DateTimeValueFormat>('iso');
  seconds = input(false);
  /** The old app-date-and-time-picker's steps */
  hourStep = input(1);
  minuteStep = input(15);
  secondStep = input(30);
  clearLabel = input('Clear');
  todayLabel = input('Today');
  doneLabel = input('Done');

  /** A day was picked in the calendar */
  dateSelect = output<Date>();

  /** The time is picked after the day, so a pick doesn't close the panel */
  protected readonly defaultAutoClose: PickerAutoClose = 'outside';

  protected readonly value = signal<Date | null>(null);
  protected readonly text = signal('');
  /** Typed text that is no date and time */
  private readonly invalidText = signal<string | null>(null);
  protected readonly time = computed<TimeStruct | null>(() => {
    const value = this.value();
    return value ? {hour: value.getHours(), minute: value.getMinutes(), second: value.getSeconds()} : null;
  });
  protected readonly typedFormat = computed(() => (this.seconds() ? 'DD.MM.YYYY HH:mm:ss' : 'DD.MM.YYYY HH:mm'));

  private onChange: (value: unknown) => void = () => {};

  protected onType(text: string): void {
    this.text.set(text);
    const date = text.trim() ? parseTypedDate(text) : null;
    this.invalidText.set(text.trim() && !date ? text : null);
    this.value.set(date);
    // As the old app-date-and-time-picker: text that is no date and time goes to the form as it is (and is invalid)
    this.onChange(date ? toDateTimeValue(date, this.valueFormat()) : (text === '' ? null : text));
  }

  protected onTextCommit(): void {
    const date = this.value();
    if (date) this.text.set(this.format(date));
  }

  /** A picked day keeps the time already set (00:00 for a new value) */
  protected pickDate(day: Date): void {
    const current = this.value();
    this.set(new Date(day.getFullYear(), day.getMonth(), day.getDate(),
      current?.getHours() ?? 0, current?.getMinutes() ?? 0, current?.getSeconds() ?? 0));
    this.dateSelect.emit(day);
    this.closeAfterPick();
  }

  /** A time while there is no day yet goes on today; a time with an empty unit waits until it is complete */
  protected pickTime(time: TimeStruct | null): void {
    if (!time) return;
    const day = this.value() ?? new Date();
    this.set(new Date(day.getFullYear(), day.getMonth(), day.getDate(), time.hour, time.minute, this.seconds() ? time.second : 0));
  }

  /** As the old footers' Today: today at the current hour and minute, then the panel closes */
  today(): void {
    const now = new Date();
    this.set(new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes()));
    this.close(true);
  }

  clear(): void {
    this.value.set(null);
    this.text.set('');
    this.invalidText.set(null);
    this.onChange(null);
    this.onTouched();
  }

  private set(date: Date): void {
    this.value.set(date);
    this.text.set(this.format(date));
    this.invalidText.set(null);
    this.onChange(toDateTimeValue(date, this.valueFormat()));
  }

  private format(date: Date): string {
    return `${formatDate(date)} ${formatTime(date, this.seconds())}`;
  }

  writeValue(value: unknown): void {
    const date = toDate(value);
    this.value.set(date);
    this.text.set(date ? this.format(date) : '');
    this.invalidText.set(null);
  }

  registerOnChange(fn: (value: unknown) => void): void { this.onChange = fn; }

  validate(control: AbstractControl): ValidationErrors | null {
    const invalid = this.invalidText();
    if (invalid !== null) return {ngbDate: {invalid}};
    const value: unknown = control.value;
    if (value === null || value === undefined || value === '') return null;
    const date = toDate(value);
    return date ? this.rangeErrors(date, value) : {ngbDate: {invalid: value}};
  }
}
