import { Component, ChangeDetectionStrategy, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef } from '@angular/cdk/dialog';
import { ButtonComponent } from '../button/button.component';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-dialog-title',
  template: `
    <span class="app-dialog-title__text"><ng-content></ng-content></span>
    @if (closable() && dialogRef) {
      <button
        app-button
        appearance="icon"
        type="button"
        class="app-dialog-title__close"
        aria-label="Close dialog"
        (click)="dialogRef.close()"
      >
        <app-icon icon="close"></app-icon>
      </button>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ButtonComponent, IconComponent],
  host: {
    'class': 'app-dialog-title'
  }
})
export class DialogTitleComponent {
  closable = input<boolean>(true);
  protected dialogRef = inject(DialogRef, { optional: true });
}

@Component({
  selector: 'app-dialog-content',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  host: {
    'class': 'app-dialog-content'
  }
})
export class DialogContentComponent {}

@Component({
  selector: 'app-dialog-actions',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  host: {
    'class': 'app-dialog-actions'
  }
})
export class DialogActionsComponent {}
