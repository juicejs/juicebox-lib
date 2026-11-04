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
  /** Set by `[promiseBtn]` while its promise runs */
  private readonly loading = signal(false);
  /** `disabled` input combined with a disable set by a directive (see DISABLEABLE) or a running `[promiseBtn]`. */
  readonly isDisabled = computed(() => this.disabled() || this.externallyDisabled() || this.loading());

  computedClasses() {
    return `app-button app-button-${this.appearance()} app-button-${this.color()}`;
  }

  setExternallyDisabled(disabled: boolean) {
    this.externallyDisabled.set(disabled);
  }

  setLoading(loading: boolean) {
    this.loading.set(loading);
  }

  handleClick(event: MouseEvent) {
    if (!this.isDisabled()) {
      this.clicked.emit(event);
    }
  }
}
