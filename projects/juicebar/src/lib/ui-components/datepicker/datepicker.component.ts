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
    .app-datepicker-input {
      width: 100%;
      border: none;
      outline: none;
      background: transparent;
      font: inherit;
      color: inherit;
      padding: 0.5rem 0.75rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
