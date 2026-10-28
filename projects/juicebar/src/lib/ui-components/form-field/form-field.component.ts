import { Component, ChangeDetectionStrategy, ViewEncapsulation, computed, inject, input, signal } from '@angular/core';

let nextFieldId = 0;

@Component({
  selector: 'app-form-field',
  templateUrl: './form-field.component.html',
  styleUrls: ['./form-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: []
})
export class FormFieldComponent {
  appearance = input<'outline' | 'fill'>('outline');

  /**
   * Fixed id for the control, for a label outside the field:
   * `<label for="user-email">` + `<app-form-field controlId="user-email">`.
   */
  readonly controlIdInput = input<string | undefined>(undefined, { alias: 'controlId' });

  private readonly ownControlId = signal<string | null>(null);
  private readonly generatedId = `app-field-${nextFieldId++}`;

  /** id of the field's control (appInput or app-select); app-label points at it. An id set on the control wins. */
  readonly controlId = computed(() => this.ownControlId() ?? this.controlIdInput() ?? this.generatedId);

  /** Called by a control that has its own id attribute */
  useControlId(id: string) {
    this.ownControlId.set(id);
  }
}

@Component({
  selector: 'app-label',
  template: '<label class="app-label-text" [attr.for]="target()"><ng-content></ng-content></label>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
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

    .app-label-text {
      display: block;
    }
  `]
})
export class LabelComponent {
  private readonly field = inject(FormFieldComponent, { optional: true });
  /** id of the labelled control, for a label placed outside app-form-field */
  readonly forId = input<string | undefined>(undefined, { alias: 'for' });
  protected readonly target = computed(() => this.forId() ?? this.field?.controlId());
}


@Component({
  selector: 'app-error',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
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
