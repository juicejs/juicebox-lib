import { Component, ChangeDetectionStrategy, computed, forwardRef, input, output, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DISABLEABLE, Disableable } from '../disableable';

@Component({
  selector: 'app-checkbox',
  templateUrl: './checkbox.component.html',
  styleUrls: ['./checkbox.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  providers: [{ provide: DISABLEABLE, useExisting: forwardRef(() => CheckboxComponent) }]
})
export class CheckboxComponent implements Disableable {
  checked = model<boolean>(false);
  disabled = input<boolean>(false);
  color = input<string>('primary');

  change = output<boolean>();

  private readonly externallyDisabled = signal(false);
  protected readonly isDisabled = computed(() => this.disabled() || this.externallyDisabled());

  setExternallyDisabled(disabled: boolean) {
    this.externallyDisabled.set(disabled);
  }

  onCheckboxChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.checked.set(target.checked);
    this.change.emit(target.checked);
  }
}
