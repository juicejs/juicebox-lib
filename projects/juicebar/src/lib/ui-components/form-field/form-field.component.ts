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
      color: var(--color-text-secondary);
      font-size: 11.5px;
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
      color: var(--color-error);
      font-size: 11px;
      font-weight: 500;
    }
  `]
})
export class ErrorComponent {}
