import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  imports: [CommonModule],
  host: {
    'class': 'app-tooltip'
  }
})
export class TooltipComponent {
  text = '';
  title = '';
}
