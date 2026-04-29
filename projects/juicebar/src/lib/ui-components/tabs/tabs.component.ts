import { Component, ChangeDetectionStrategy, signal, input, output, model, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tabs',
  template: `
    <div class="app-tabs-header">
      <ng-content select="app-tab"></ng-content>
    </div>
    <div class="app-tabs-content">
      <ng-content></ng-content>
    </div>
  `,
  styleUrls: ['./tabs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  host: {
    'class': 'app-tabs'
  }
})
export class TabsComponent {
  selectedIndex = model<number>(0);
  selectedIndexChange = output<number>();
}

@Component({
  selector: 'app-tab',
  template: '<ng-content></ng-content>',
  styleUrls: ['./tabs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  host: {
    'class': 'app-tab',
    '[class.app-tab-active]': 'active()',
    '[class.app-tab-disabled]': 'disabled()'
  }
})
export class TabComponent {
  label = input.required<string>();
  active = input<boolean>(false);
  disabled = input<boolean>(false);
}
