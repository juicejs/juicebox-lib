import {Component, computed, forwardRef, input, signal} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {DISABLEABLE, Disableable} from '../disableable';
import {TimeStruct} from '../datepicker/date-utils';

type TimeUnit = 'hour' | 'minute' | 'second';

interface TimeField {
  unit: TimeUnit;
  text: string;
  label: string;
  placeholder: string;
  step: number;
  /** The spinners' labels, e.g. "Minutes +15" */
  upLabel: string;
  downLabel: string;
}

/** ngb's NgbTime: a unit that is not a number stays empty, the others wrap and carry */
interface TimeModel {
  hour: number;
  minute: number;
  second: number;
}

function toInteger(value: unknown): number {
  return parseInt(`${value}`, 10);
}

function pad(value: number): string {
  return Number.isNaN(value) ? '' : String(value).padStart(2, '0');
}

/**
 * A time, after the old ngb-timepicker: hours, minutes and optionally seconds, typed or stepped with the spinners and the
 * arrow keys (`hourStep`, `minuteStep`, `secondStep`). Minutes and seconds carry into the next unit and hours wrap at 24,
 * as ngb's did. The form gets ngb's `{hour, minute, second}`, or null while a unit is empty.
 */
@Component({
  selector: 'app-timepicker',
  templateUrl: './timepicker.component.html',
  styleUrl: './timepicker.component.scss',
  host: {
    'class': 'app-timepicker',
    '[class.app-timepicker-small]': 'size() === "small"',
    '[class.app-timepicker-large]': 'size() === "large"',
  },
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => TimepickerComponent),
    multi: true,
  }, {
    provide: DISABLEABLE,
    useExisting: forwardRef(() => TimepickerComponent),
  }],
})
export class TimepickerComponent implements ControlValueAccessor, Disableable {
  seconds = input(false);
  hourStep = input(1);
  minuteStep = input(1);
  secondStep = input(1);
  /** The up and down buttons around each unit */
  spinners = input(true);
  /** The units can only be stepped, not typed */
  readonlyInputs = input(false);
  size = input<'small' | 'medium' | 'large'>('medium');
  hoursLabel = input('Hours');
  minutesLabel = input('Minutes');
  secondsLabel = input('Seconds');

  private readonly model = signal<TimeModel>({hour: NaN, minute: NaN, second: 0});

  private readonly formDisabled = signal(false);
  private readonly externallyDisabled = signal(false);
  protected readonly isDisabled = computed(() => this.formDisabled() || this.externallyDisabled());

  protected readonly fields = computed<TimeField[]>(() => {
    const {hour, minute, second} = this.model();
    const field = (unit: TimeUnit, value: number, label: string, placeholder: string, step: number): TimeField =>
      ({unit, text: pad(value), label, placeholder, step, upLabel: `${label} +${step}`, downLabel: `${label} -${step}`});
    const fields = [
      field('hour', hour, this.hoursLabel(), 'HH', this.hourStep()),
      field('minute', minute, this.minutesLabel(), 'MM', this.minuteStep()),
    ];
    if (this.seconds()) fields.push(field('second', second, this.secondsLabel(), 'SS', this.secondStep()));
    return fields;
  });

  private onChange: (value: TimeStruct | null) => void = () => {};
  private onTouched: () => void = () => {};

  protected step(unit: TimeUnit, step: number): void {
    this.model.update(model => {
      const next = {...model};
      if (unit === 'hour') this.changeHour(next, step);
      if (unit === 'minute') this.changeMinute(next, step);
      if (unit === 'second') this.changeSecond(next, step);
      return next;
    });
    this.propagate();
  }

  protected type(unit: TimeUnit, input: HTMLInputElement): void {
    const value = toInteger(input.value);
    this.model.update(model => {
      const next = {...model};
      if (unit === 'hour') this.updateHour(next, value);
      if (unit === 'minute') this.updateMinute(next, value);
      if (unit === 'second') this.updateSecond(next, value);
      return next;
    });
    // Shows the unit as two digits also when the model didn't change (7 for 07)
    input.value = pad(this.model()[unit]);
    this.propagate();
  }

  /** As ngb: only digits can be typed */
  protected onlyDigits(input: HTMLInputElement): void {
    input.value = input.value.replace(/[^0-9]/g, '');
  }

  protected handleBlur(): void {
    this.onTouched();
  }

  private changeHour(model: TimeModel, step: number): void {
    this.updateHour(model, (Number.isNaN(model.hour) ? 0 : model.hour) + step);
  }

  private updateHour(model: TimeModel, hour: number): void {
    model.hour = Number.isNaN(hour) ? NaN : (hour < 0 ? 24 + hour : hour) % 24;
  }

  private changeMinute(model: TimeModel, step: number): void {
    this.updateMinute(model, (Number.isNaN(model.minute) ? 0 : model.minute) + step);
  }

  private updateMinute(model: TimeModel, minute: number): void {
    if (Number.isNaN(minute)) {
      model.minute = NaN;
      return;
    }
    model.minute = minute % 60 < 0 ? 60 + minute % 60 : minute % 60;
    this.changeHour(model, Math.floor(minute / 60));
  }

  private changeSecond(model: TimeModel, step: number): void {
    this.updateSecond(model, (Number.isNaN(model.second) ? 0 : model.second) + step);
  }

  private updateSecond(model: TimeModel, second: number): void {
    if (Number.isNaN(second)) {
      model.second = NaN;
      return;
    }
    model.second = second % 60 < 0 ? 60 + second % 60 : second % 60;
    this.changeMinute(model, Math.floor(second / 60));
  }

  private propagate(): void {
    this.onTouched();
    const {hour, minute, second} = this.model();
    const valid = !Number.isNaN(hour) && !Number.isNaN(minute) && (!this.seconds() || !Number.isNaN(second));
    this.onChange(valid ? {hour, minute, second: Number.isNaN(second) ? 0 : second} : null);
  }

  writeValue(value: Partial<TimeStruct> | null): void {
    const second = toInteger(value?.second);
    this.model.set({
      hour: toInteger(value?.hour),
      minute: toInteger(value?.minute),
      // As ngb: without seconds a missing second is 0
      second: !this.seconds() && Number.isNaN(second) ? 0 : second,
    });
  }

  registerOnChange(fn: (value: TimeStruct | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.formDisabled.set(disabled); }
  setExternallyDisabled(disabled: boolean): void { this.externallyDisabled.set(disabled); }
}
