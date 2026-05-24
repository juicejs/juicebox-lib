import { Component, ChangeDetectionStrategy, model, input, output, forwardRef } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

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
    }
  ]
})
export class SlideToggleComponent implements ControlValueAccessor {
  checked = model<boolean>(false);
  disabled = input<boolean>(false);

  toggled = output<boolean>();

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
    // disabled is an input(), handled via [disabled] binding in template
  }
}
