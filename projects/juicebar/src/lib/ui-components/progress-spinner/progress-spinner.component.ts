import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';

@Component({
  selector: 'app-progress-spinner',
  template: '<div class="spinner" [style.width.px]="diameter()" [style.height.px]="diameter()" [style.border-width.px]="strokeWidth()"></div>',
  styleUrls: ['./progress-spinner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  host: {
    'class': 'app-progress-spinner'
  }
})
export class ProgressSpinnerComponent {
  diameter = input<number>(40);
  protected readonly strokeWidth = computed(() => Math.max(2, Math.round(this.diameter() / 10)));
}
