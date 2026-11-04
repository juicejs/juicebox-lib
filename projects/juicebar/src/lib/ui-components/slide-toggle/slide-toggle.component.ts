import { Component, ChangeDetectionStrategy, model, input, output, forwardRef, signal, computed } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DISABLEABLE, Disableable } from '../disableable';

@Component({
  selector: 'app-slide-toggle',
  templateUrl: './slide-toggle.component.html',
  styleUrls: ['./slide-toggle.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SlideToggleComponent),
      multi: true,
    },
    { provide: DISABLEABLE, useExisting: forwardRef(() => SlideToggleComponent) },
  ]
})
export class SlideToggleComponent implements ControlValueAccessor, Disableable {
  checked = model<boolean>(false);
  disabled = input<boolean>(false);

  toggled = output<boolean>();

  /** Disabled by the `disabled` input, the form control (`control.disable()`) or a permission directive */
  private readonly formDisabled = signal(false);
  private readonly externallyDisabled = signal(false);
  protected readonly isDisabled = computed(() => this.disabled() || this.formDisabled() || this.externallyDisabled());

  private onChange: (v: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  onToggleChange(event: Event) {
    const value = (event.target as HTMLInputElement).checked;
    this.checked.set(value);
    this.toggled.emit(value);
    this.onChange(value);
    this.onTouched();
  }

  writeValue(value: boolean): void {
    this.checked.set(!!value);
  }

  registerOnChange(fn: (v: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }

  setExternallyDisabled(disabled: boolean): void {
    this.externallyDisabled.set(disabled);
  }
}
