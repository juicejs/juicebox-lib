import { Component, ChangeDetectionStrategy, ViewEncapsulation, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-form-field',
  templateUrl: './form-field.component.html',
  styleUrls: ['./form-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule]
})
export class FormFieldComponent {
  appearance = input<'outline' | 'fill'>('outline');
}

@Component({
  selector: 'app-label',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  host: {
    'class': 'app-label'
  },
  styles: [`
    :host {
      display: block;
      margin-bottom: var(--spacing-xs, 0.25rem);
      color: var(--color-text-secondary, rgba(0, 0, 0, 0.6));
      font-size: 0.9rem;
      font-weight: 500;
    }
  `]
})
export class LabelComponent {}


@Component({
  selector: 'app-error',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  host: {
    'class': 'app-error'
  },
  styles: [`
    :host {
      display: block;
      margin-top: var(--spacing-xs, 0.25rem);
      color: var(--color-error, #f44336);
      font-size: 0.75rem;
      font-weight: 500;
    }
  `]
})
export class ErrorComponent {}
