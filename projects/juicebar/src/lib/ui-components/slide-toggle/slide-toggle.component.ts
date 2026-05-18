import { Component, ChangeDetectionStrategy, model, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-slide-toggle',
  templateUrl: './slide-toggle.component.html',
  styleUrls: ['./slide-toggle.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule]
})
export class SlideToggleComponent {
  checked = model<boolean>(false);
  disabled = input<boolean>(false);

  toggled = output<boolean>();

  onToggleChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.checked.set(target.checked);
    this.toggled.emit(target.checked);
  }
}
