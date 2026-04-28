import { Component, ChangeDetectionStrategy, input, output, model, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkListboxModule } from '@angular/cdk/listbox';
import { CdkOverlayOrigin, CdkConnectedOverlay, OverlayModule } from '@angular/cdk/overlay';

@Component({
  selector: 'app-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CdkListboxModule, OverlayModule]
})
export class SelectComponent {
  value = model<any>(null);
  disabled = input<boolean>(false);
  placeholder = input<string>('Select an option');

  selectionChange = output<any>();

  isOpen = signal(false);
  displayValue = signal<string>('');

  toggle() {
    if (!this.disabled()) {
      this.isOpen.update(v => !v);
    }
  }

  close() {
    this.isOpen.set(false);
  }

  onSelectionChange(value: any) {
    this.value.set(value);
    this.selectionChange.emit(value);
    this.close();
  }
}

@Component({
  selector: 'app-option',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  host: {
    'class': 'app-option',
    '[class.app-option-selected]': 'selected()',
    '(click)': 'onClick()'
  }
})
export class OptionComponent {
  value = input.required<any>();
  selected = input<boolean>(false);
  optionClick = output<any>();

  onClick() {
    this.optionClick.emit(this.value());
  }
}
