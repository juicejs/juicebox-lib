import {ChangeDetectionStrategy, Component, forwardRef, input, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';

@Component({
  selector: 'app-datepicker',
  template: `
    <input type="date"
           class="app-datepicker-input"
           [value]="dateValue()"
           [disabled]="disabled()"
           [readonly]="readonly()"
           [attr.placeholder]="placeholder()"
           (input)="onInput($any($event.target).value)"
           (blur)="onTouched()">
  `,
  styles: [`
    :host { display: inline-block; width: 100%; }
    /* Match the outlined look of the standard form-field inputs, since the
       form-field's own input styles can't reach this encapsulated input. */
    .app-datepicker-input {
      width: 100%;
      height: 32px;
      padding: 0 10px;
      font-family: inherit;
      font-size: 12.5px;
      color: var(--color-text-primary);
      background: var(--color-background);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .app-datepicker-input:hover:not(:disabled):not([readonly]) {
      border-color: var(--color-border-dark);
    }
    .app-datepicker-input:focus {
      border-color: var(--color-secondary);
      box-shadow: 0 0 0 3px rgba(var(--color-secondary-rgb), 0.15);
    }
    /* Native calendar icon: dark theme is the default, so lighten it.
       Under the light theme keep it dark so it stays visible. */
    .app-datepicker-input::-webkit-calendar-picker-indicator {
      cursor: pointer;
      opacity: 0.9;
      filter: invert(1);
    }
    :host-context(html.light-theme) .app-datepicker-input::-webkit-calendar-picker-indicator {
      filter: invert(0);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.has-value]': '!!dateValue()',
  },
  imports: [CommonModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => DatepickerComponent),
    multi: true,
  }],
})
export class DatepickerComponent implements ControlValueAccessor {
  placeholder = input<string>('');
  readonly = input<boolean>(false);

  dateValue = signal<string>('');
  disabled = signal<boolean>(false);

  private onChange: (value: Date | null) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(value: Date | string | null): void {
    if (!value) {
      this.dateValue.set('');
      return;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) {
      this.dateValue.set('');
      return;
    }
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    this.dateValue.set(`${yyyy}-${mm}-${dd}`);
  }

  registerOnChange(fn: (value: Date | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled.set(disabled); }

  onInput(value: string): void {
    this.dateValue.set(value);
    if (!value) {
      this.onChange(null);
      return;
    }
    const date = new Date(value);
    this.onChange(isNaN(date.getTime()) ? null : date);
  }
}
