import { Component, ChangeDetectionStrategy, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidenav-container',
  template: '<ng-content></ng-content>',
  styleUrls: ['./sidenav.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  host: {
    'class': 'app-sidenav-container'
  }
})
export class SidenavContainerComponent {}

@Component({
  selector: 'app-sidenav',
  template: '<ng-content></ng-content>',
  styleUrls: ['./sidenav.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  host: {
    'class': 'app-sidenav',
    '[class.app-sidenav-opened]': 'opened()'
  }
})
export class SidenavComponent {
  opened = signal(false);
  mode = input<'over' | 'push' | 'side'>('side');

  toggle() {
    this.opened.update(v => !v);
  }

  open() {
    this.opened.set(true);
  }

  close() {
    this.opened.set(false);
  }
}
