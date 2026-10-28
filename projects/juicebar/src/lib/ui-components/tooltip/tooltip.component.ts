import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-tooltip',
  template: `
    @if (title) {
      <div class="tooltip-title">{{ title }}</div>
    }
    <div class="tooltip-body">{{ text }}</div>
  `,
  styleUrls: ['./tooltip.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  host: {
    'class': 'app-tooltip',
    'role': 'tooltip',
    '[id]': 'id'
  }
})
export class TooltipComponent {
  text = '';
  title = '';
  id = '';
}
