import {Component, inject, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {DIALOG_DATA, DialogRef} from '@angular/cdk/dialog';
import {
  ButtonComponent,
  DialogActionsComponent,
  DialogContentComponent,
  DialogTitleComponent,
  ErrorComponent,
  FormFieldComponent,
  InputDirective,
  LabelComponent,
} from '../../../../../ui-components';
import {PromiseButtonDirective} from '../../../../shared/directives/PromiseButton';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {CommunicationsService} from '../../communications.service';
import {CommunicationsTranslationPipe} from '../../i18n/communications.translation';

export interface ContentCreateDialogData {
  /** AMG (`amgshop`): the content gets a tag */
  tags: boolean;
}

/**
 * Creates a content with its name and subject, and AMG's tag (CreateContentDialog). Closes with true once the
 * content was asked for, also when the backend answered nothing (with the "Error" notice), as the old dialog did.
 */
@Component({
  selector: 'app-content-create-dialog',
  templateUrl: './content-create-dialog.component.html',
  imports: [
    ReactiveFormsModule,
    DialogTitleComponent,
    DialogContentComponent,
    DialogActionsComponent,
    FormFieldComponent,
    LabelComponent,
    ErrorComponent,
    InputDirective,
    ButtonComponent,
    PromiseButtonDirective,
    CommunicationsTranslationPipe,
  ],
  providers: [CommunicationsTranslationPipe],
})
export class ContentCreateDialogComponent {
  private readonly communications = inject(CommunicationsService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);
  private readonly i18n = inject(CommunicationsTranslationPipe);
  protected readonly data = inject<ContentCreateDialogData>(DIALOG_DATA);

  protected readonly form = new FormGroup({
    name: new FormControl('', {nonNullable: true, validators: Validators.required}),
    subject: new FormControl('', {nonNullable: true, validators: Validators.required}),
    tag: new FormControl('', {nonNullable: true}),
  });
  protected readonly createPromise = signal<Promise<void>>(Promise.resolve());

  protected create(): void {
    this.createPromise.set(this.save());
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  private async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const {name, subject, tag} = this.form.getRawValue();
    // What the old dialog sent; the backend gives the content its type, communications:default
    const contentId = await this.communications.createContent({name, type: '', subject, tag: this.data.tags ? tag : ''});
    if (!contentId) this.juicebox.showToast('error', this.i18n.transform('error'));
    this.dialogRef.close(true);
  }
}
