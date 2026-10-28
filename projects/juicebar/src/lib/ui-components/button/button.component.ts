import { Component, ChangeDetectionStrategy, computed, forwardRef, input, output, signal } from '@angular/core';
import { DISABLEABLE, Disableable } from '../disableable';

export type ButtonVariant = 'primary' | 'accent' | 'warn' | 'basic';
export type ButtonAppearance = 'raised' | 'stroked' | 'flat' | 'icon';

@Component({
  selector: 'button[app-button], a[app-button]',
  template: '<ng-content></ng-content>',
  styleUrls: ['./button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  providers: [{ provide: DISABLEABLE, useExisting: forwardRef(() => ButtonComponent) }],
  host: {
    '[class]': 'computedClasses()',
    '[attr.disabled]': 'isDisabled() || null',
    '[attr.type]': 'type()',
    '[attr.aria-disabled]': 'isDisabled()',
    '(click)': 'handleClick($event)'
  }
})
export class ButtonComponent implements Disableable {
  color = input<ButtonVariant>('basic');
  appearance = input<ButtonAppearance>('flat');
  disabled = input<boolean>(false);
  type = input<string>('button');

  clicked = output<MouseEvent>();

  private readonly externallyDisabled = signal(false);
  /** `disabled` input combined with a disable set by a directive (see DISABLEABLE). */
  readonly isDisabled = computed(() => this.disabled() || this.externallyDisabled());

  computedClasses() {
    return `app-button app-button-${this.appearance()} app-button-${this.color()}`;
  }

  setExternallyDisabled(disabled: boolean) {
    this.externallyDisabled.set(disabled);
  }

  handleClick(event: MouseEvent) {
    if (!this.isDisabled()) {
      this.clicked.emit(event);
    }
  }
}
