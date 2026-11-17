import {Component, inject} from '@angular/core';
import {DialogRef} from '@angular/cdk/dialog';
import {
  ButtonComponent,
  DIALOG_DATA,
  DialogActionsComponent,
  DialogContentComponent,
  DialogTitleComponent,
  FormFieldComponent,
  InputDirective,
  LabelComponent,
} from '../../../../../ui-components';
import {EntitiesTranslationPipe} from '../../i18n/entities.translation';

/** Shows a new API key's token, once: it cannot be read again later */
@Component({
  selector: 'app-key-preview-dialog',
  templateUrl: './key-preview-dialog.component.html',
  imports: [
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
export class KeyPreviewDialogComponent {
  private readonly dialogRef = inject<DialogRef<void>>(DialogRef);
  protected readonly token = inject<string>(DIALOG_DATA);

  protected close(): void {
    this.dialogRef.close();
  }
}
