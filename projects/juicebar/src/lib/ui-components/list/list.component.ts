import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-nav-list, app-list',
  template: '<ng-content></ng-content>',
  styleUrls: ['./list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
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
  imports: [CommonModule],
  host: {
    'class': 'app-list-item'
  }
})
export class ListItemComponent {}
