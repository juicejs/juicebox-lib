import { Component, ChangeDetectionStrategy, ViewEncapsulation, computed, input, output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

export type SnackbarType = 'success' | 'error' | 'warning' | 'info';

const SNACKBAR_ICONS: Record<SnackbarType, string> = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

@Component({
  selector: 'app-snackbar',
  template: `
    <div [class]="snackbarClass()" [attr.role]="role()">
      @if (icon(); as icon) {
        <app-icon class="app-snackbar__icon" [icon]="icon" />
      }
      <div class="app-snackbar__text">
        @if (title()) {
          <strong class="app-snackbar__title">{{ title() }}</strong>
        }
        <span class="app-snackbar__message" [class.app-snackbar__message--secondary]="title()">{{ message() }}</span>
      </div>
      @if (action()) {
        <button type="button" class="app-snackbar__action" (click)="dismissed.emit()">{{ action() }}</button>
      } @else {
        <button type="button" class="app-snackbar__close" aria-label="Close" (click)="dismissed.emit()">
          <app-icon icon="close" />
        </button>
      }
    </div>
  `,
  styleUrls: ['./snackbar.component.scss'],
  // Not encapsulated: the stacking container is created by SnackbarService outside any component view.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent]
})
export class SnackbarComponent {
  readonly message = input('');
  readonly title = input('');
  readonly action = input('');
  readonly type = input<SnackbarType>();

  readonly dismissed = output<void>();

  protected readonly snackbarClass = computed(() => {
    const type = this.type();
    return type ? `app-snackbar app-snackbar--${type}` : 'app-snackbar';
  });
  protected readonly role = computed(() => (this.type() === 'error' ? 'alert' : 'status'));
  /** The type is shown by an icon as well as its colour */
  protected readonly icon = computed(() => {
    const type = this.type();
    return type ? SNACKBAR_ICONS[type] : null;
  });
}
