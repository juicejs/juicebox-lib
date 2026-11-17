import {Component, inject, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {DialogRef} from '@angular/cdk/dialog';
import {
  ButtonComponent,
  DialogActionsComponent,
  DialogContentComponent,
  DialogTitleComponent,
  ErrorComponent,
  FormFieldComponent,
  InputDirective,
  LabelComponent,
  OptionComponent,
  SelectComponent,
  SlideToggleComponent,
} from '../../../../../../ui-components';
import {PromiseButtonDirective} from '../../../../../shared/directives/PromiseButton';
import {EntitiesService} from '../../../entities.service';
import {ATTRIBUTE_ENTITY_TYPES} from '../../../entity-form';
import {EntitiesTranslationPipe} from '../../../i18n/entities.translation';

/**
 * Adds an attribute field for a customer type: a text, a number, a date or a dropdown with its values. Closes with
 * `true` once the backend stored it; its refusal (e.g. the field exists already) is shown in the dialog.
 */
@Component({
  selector: 'app-add-attribute-dialog',
  templateUrl: './add-attribute-dialog.component.html',
  styleUrl: '../attribute-dialog.scss',
  imports: [
    ReactiveFormsModule,
    DialogTitleComponent,
    DialogContentComponent,
    DialogActionsComponent,
    FormFieldComponent,
    LabelComponent,
    ErrorComponent,
    InputDirective,
    SelectComponent,
    OptionComponent,
    SlideToggleComponent,
    ButtonComponent,
    PromiseButtonDirective,
    EntitiesTranslationPipe,
  ],
  providers: [EntitiesTranslationPipe],
})
export class AddAttributeDialogComponent {
  private readonly entities = inject(EntitiesService);
  private readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);
  private readonly i18n = inject(EntitiesTranslationPipe);

  protected readonly datatypes = ['text', 'number', 'date', 'dropdown'];
  protected readonly entityTypes = [
    ...ATTRIBUTE_ENTITY_TYPES.map(type => ({key: `entity:${type}`, name: this.i18n.transform(type)})),
    {key: 'entity:shop', name: 'Shop'},
  ];
  protected readonly form = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(15), Validators.pattern(/^[A-Za-z0-9_]+$/)]),
    entityType: new FormControl('', Validators.required),
    label: new FormControl('', Validators.required),
    datatype: new FormControl('', Validators.required),
    values: new FormControl(''),
    // As the old dialog: not set until the switch is used
    required: new FormControl<boolean | ''>(''),
  });
  protected readonly dropdown = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly createPromise = signal<Promise<void> | null>(null);

  protected datatypeChanged(datatype: string): void {
    this.dropdown.set(datatype === 'dropdown');
  }

  protected create(): void {
    this.createPromise.set(this.save());
  }

  protected cancel(): void {
    this.dialogRef.close(false);
  }

  private async save(): Promise<void> {
    this.message.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const result = await this.entities.createAttribute(this.form.getRawValue());
    if (result?.success) {
      this.dialogRef.close(true);
    } else {
      this.message.set(result?.error ?? String(this.i18n.transform('error')));
    }
  }
}
