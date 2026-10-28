import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-toolbar',
  template: '<ng-content></ng-content>',
  styleUrls: ['./toolbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  host: {
    'class': 'app-toolbar'
  }
})
export class ToolbarComponent {}
