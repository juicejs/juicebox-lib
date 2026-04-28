import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from '@angular/cdk/dialog';

@Component({
  selector: 'app-dialog-title',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  host: {
    'class': 'app-dialog-title'
  }
})
export class DialogTitleComponent {}

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
