import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkMenuModule } from '@angular/cdk/menu';

@Component({
  selector: 'button[app-menu-trigger]',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CdkMenuModule],
  host: {
    '[cdkMenuTriggerFor]': 'menu',
    'class': 'app-menu-trigger'
  }
})
export class MenuTriggerComponent {
  menu: any;
}

@Component({
  selector: 'app-menu',
  template: '<ng-content></ng-content>',
  styleUrls: ['./menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CdkMenuModule],
  host: {
    'cdkMenu': '',
    'class': 'app-menu'
  }
})
export class MenuComponent {}

@Component({
  selector: 'button[app-menu-item]',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CdkMenuModule],
  host: {
    'cdkMenuItem': '',
    'class': 'app-menu-item'
  }
})
export class MenuItemComponent {}
