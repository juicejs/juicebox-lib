import { Component, ChangeDetectionStrategy, input, output, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-checkbox',
  templateUrl: './checkbox.component.html',
  styleUrls: ['./checkbox.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule]
})
export class CheckboxComponent {
  checked = model<boolean>(false);
  disabled = input<boolean>(false);
  color = input<string>('primary');

  change = output<boolean>();

  onCheckboxChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.checked.set(target.checked);
    this.change.emit(target.checked);
  }
}
