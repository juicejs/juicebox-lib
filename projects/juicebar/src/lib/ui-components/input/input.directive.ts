import { Directive, HostAttributeToken, computed, inject } from '@angular/core';
import { FormFieldComponent } from '../form-field/form-field.component';

/** Styled input (styles are global, in styles.scss). Inside app-form-field it gets the id the field's app-label points at. */
@Directive({
  selector: 'input[appInput], textarea[appInput], select[appInput]',
  host: {
    'class': 'app-input',
    '[attr.id]': 'id()'
  }
})
export class InputDirective {
  private readonly field = inject(FormFieldComponent, { optional: true });
  private readonly ownId = inject(new HostAttributeToken('id'), { optional: true });
  protected readonly id = computed(() => this.ownId ?? this.field?.controlId() ?? null);

  constructor() {
    if (this.ownId && this.field) {
      this.field.useControlId(this.ownId);
    }
  }
}
