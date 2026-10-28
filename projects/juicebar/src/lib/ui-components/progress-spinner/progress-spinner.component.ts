import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-progress-spinner',
  template: '<div class="spinner"></div>',
  styleUrls: ['./progress-spinner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  host: {
    'class': 'app-progress-spinner'
  }
})
export class ProgressSpinnerComponent {
  diameter = input<number>(40);
}
