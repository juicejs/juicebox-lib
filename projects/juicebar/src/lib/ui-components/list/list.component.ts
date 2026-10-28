import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-nav-list, app-list',
  template: '<ng-content></ng-content>',
  styleUrls: ['./list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  host: {
    'class': 'app-nav-list'
  }
})
export class NavListComponent {}

@Component({
  selector: 'app-list-item',
  template: '<ng-content></ng-content>',
  styleUrls: ['./list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  host: {
    'class': 'app-list-item'
  }
})
export class ListItemComponent {}
