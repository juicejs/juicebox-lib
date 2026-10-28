import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-divider',
  template: '',
  styleUrls: ['./divider.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  host: {
    'class': 'app-divider'
  }
})
export class DividerComponent {}
