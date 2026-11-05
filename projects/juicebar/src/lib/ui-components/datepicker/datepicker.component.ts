import {Component, computed, forwardRef, input, output, signal} from '@angular/core';
import {AbstractControl, ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator} from '@angular/forms';
import {NgTemplateOutlet} from '@angular/common';
import {A11yModule} from '@angular/cdk/a11y';
import {OverlayModule} from '@angular/cdk/overlay';
import {DISABLEABLE, Disableable} from '../disableable';
import {CalendarComponent} from './calendar.component';
import {DateValueFormat, formatDate, parseTypedDate, startOfDay, toDate, toDateValue} from './date-utils';
import {PickerAutoClose, PickerField} from './picker-field';

/**
 * A date field with a calendar, as the old ngbDatepicker inputs: the date is typed as DD.MM.YYYY or picked in the
 * calendar opened from the button. The form gets the day in `valueFormat` (the old adapters' shapes); the control reads
 * any of them. Typed text that is no date, or a date outside minDate/maxDate, makes the control invalid with ngb's
 * `ngbDate` error, which old forms check.
 */
@Component({
  selector: 'app-datepicker',
  templateUrl: './datepicker.component.html',
  styleUrl: './picker-field.scss',
  imports: [OverlayModule, A11yModule, NgTemplateOutlet, CalendarComponent],
  host: {
    'class': 'app-datepicker',
    '[class.has-value]': '!!value()',
  },
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => DatepickerComponent),
    multi: true,
  }, {
    provide: NG_VALIDATORS,
    useExisting: forwardRef(() => DatepickerComponent),
    multi: true,
  }, {
    provide: DISABLEABLE,
    useExisting: forwardRef(() => DatepickerComponent),
  }],
})
export class DatepickerComponent extends PickerField implements ControlValueAccessor, Validator, Disableable {
  /** The form value's shape, see `DateValueFormat`; by default ngb's `{year, month, day}`, as the old forms sent it */
  valueFormat = input<DateValueFormat>('struct');
  /** Shows a × that empties the field (the old Clear buttons in the calendar footer) */
  clearable = input(false);
  clearLabel = input('Clear');

  /** A day was picked in the calendar (ngb's dateSelect); not emitted for typed dates */
  dateSelect = output<Date>();

  protected readonly defaultAutoClose: PickerAutoClose = true;

  protected readonly value = signal<Date | null>(null);
  protected readonly text = signal('');
  /** Typed text that is no date */
  private readonly invalidText = signal<string | null>(null);
  protected readonly showClear = computed(() => this.clearable() && !this.isDisabled() && this.text() !== '');

  private onChange: (value: unknown) => void = () => {};

  protected onType(text: string): void {
    this.text.set(text);
    const typed = text.trim() ? parseTypedDate(text) : null;
    const date = typed && startOfDay(typed);
    this.invalidText.set(text.trim() && !date ? text : null);
    this.value.set(date);
    // As ngb: text that is no date goes to the form as it is (and is invalid), an empty field as null
    this.onChange(date ? toDateValue(date, this.valueFormat()) : (text === '' ? null : text));
  }

  /** As ngb on change: a typed date is shown in the full format (5.1.2026 becomes 05.01.2026) */
  protected onTextCommit(): void {
    const date = this.value();
    if (date) this.text.set(formatDate(date));
  }

  protected pick(date: Date): void {
    this.value.set(date);
    this.text.set(formatDate(date));
    this.invalidText.set(null);
    this.onChange(toDateValue(date, this.valueFormat()));
    this.dateSelect.emit(date);
    this.closeAfterPick();
  }

  clear(): void {
    this.value.set(null);
    this.text.set('');
    this.invalidText.set(null);
    this.onChange(null);
    this.onTouched();
    this.close();
  }

  writeValue(value: unknown): void {
    const date = toDate(value);
    this.value.set(date);
    this.text.set(date ? formatDate(date) : '');
    this.invalidText.set(null);
  }

  registerOnChange(fn: (value: unknown) => void): void { this.onChange = fn; }

  /** ngb's errors, under the same `ngbDate` key */
  validate(control: AbstractControl): ValidationErrors | null {
    const invalid = this.invalidText();
    if (invalid !== null) return {ngbDate: {invalid}};
    const value: unknown = control.value;
    if (value === null || value === undefined || value === '') return null;
    const date = toDate(value);
    return date ? this.rangeErrors(date, value) : {ngbDate: {invalid: value}};
  }
}
