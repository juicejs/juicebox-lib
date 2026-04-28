import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'accent' | 'warn' | 'basic';
export type ButtonAppearance = 'raised' | 'stroked' | 'flat' | 'icon';

@Component({
  selector: 'button[app-button], a[app-button]',
  template: '<ng-content></ng-content>',
  styleUrls: ['./button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  host: {
    '[class]': 'computedClasses()',
    '[disabled]': 'disabled()',
    '[attr.type]': 'type()',
    '[attr.aria-disabled]': 'disabled()',
    '(click)': 'handleClick($event)'
  }
})
export class ButtonComponent {
  color = input<ButtonVariant>('basic');
  appearance = input<ButtonAppearance>('flat');
  disabled = input<boolean>(false);
  type = input<string>('button');

  clicked = output<MouseEvent>();

  computedClasses() {
    return `app-button app-button-${this.appearance()} app-button-${this.color()}`;
  }

  handleClick(event: MouseEvent) {
    if (!this.disabled()) {
      this.clicked.emit(event);
    }
  }
}
