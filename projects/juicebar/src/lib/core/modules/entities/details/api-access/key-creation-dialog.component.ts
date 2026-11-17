import {Component, inject} from '@angular/core';
import {FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {DialogRef} from '@angular/cdk/dialog';
import {
  ButtonComponent,
  DialogActionsComponent,
  DialogContentComponent,
  DialogTitleComponent,
  FormFieldComponent,
  InputDirective,
  LabelComponent,
} from '../../../../../ui-components';
import {EntitiesTranslationPipe} from '../../i18n/entities.translation';

/** Asks for the name of a new API key, at least 8 characters; closes with the name, or with null */
@Component({
  selector: 'app-key-creation-dialog',
  templateUrl: './key-creation-dialog.component.html',
  imports: [
    ReactiveFormsModule,
    DialogTitleComponent,
    DialogContentComponent,
    DialogActionsComponent,
    FormFieldComponent,
    LabelComponent,
    InputDirective,
    ButtonComponent,
    EntitiesTranslationPipe,
  ],
  providers: [EntitiesTranslationPipe],
})
export class KeyCreationDialogComponent {
  private readonly dialogRef = inject<DialogRef<string | null>>(DialogRef);

  protected readonly keyName = new FormControl('', {nonNullable: true, validators: Validators.minLength(8)});

  protected close(): void {
    this.dialogRef.close(null);
  }

  protected submit(): void {
    this.dialogRef.close(this.keyName.value);
  }
}
