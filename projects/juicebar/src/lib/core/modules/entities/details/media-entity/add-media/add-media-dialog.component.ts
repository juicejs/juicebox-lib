import {Component, inject, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {DialogRef} from '@angular/cdk/dialog';
import {
  ButtonComponent,
  DIALOG_DATA,
  DialogActionsComponent,
  DialogContentComponent,
  DialogTitleComponent,
  FileInputComponent,
  FormFieldComponent,
  InputDirective,
  LabelComponent,
  OptionComponent,
  SelectComponent,
} from '../../../../../../ui-components';
import {PromiseButtonDirective} from '../../../../../shared/directives/PromiseButton';
import {JuiceboxService} from '../../../../../shared/services/Juicebox.service';
import {EntitiesService} from '../../../entities.service';
import {EntityMediaType} from '../../../entities.types';
import {EntitiesTranslationPipe} from '../../../i18n/entities.translation';

export interface AddMediaDialogData {
  entityId: string;
  mediaTypes: EntityMediaType[];
}

/**
 * Adds a file to a customer: the media type first, then its kind, the file, a title and a description, stored in
 * the admin's language. Closes with `true` once the file is stored.
 */
@Component({
  selector: 'app-add-media-dialog',
  templateUrl: './add-media-dialog.component.html',
  imports: [
    ReactiveFormsModule,
    DialogTitleComponent,
    DialogContentComponent,
    DialogActionsComponent,
    FormFieldComponent,
    LabelComponent,
    InputDirective,
    SelectComponent,
    OptionComponent,
    FileInputComponent,
    ButtonComponent,
    PromiseButtonDirective,
    EntitiesTranslationPipe,
  ],
  providers: [EntitiesTranslationPipe],
})
export class AddMediaDialogComponent {
  private readonly entities = inject(EntitiesService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);
  private readonly data = inject<AddMediaDialogData>(DIALOG_DATA);
  private readonly i18n = inject(EntitiesTranslationPipe);

  protected readonly mediaTypes = this.data.mediaTypes;
  /** The kinds of the media type chosen */
  protected readonly types = signal<Array<{name: string; prop: string}>>([]);
  protected readonly form = new FormGroup({
    mediaType: new FormControl('', {nonNullable: true}),
    type: new FormControl('', {nonNullable: true}),
    file: new FormControl<File | null>(null),
    title: new FormControl('', {nonNullable: true}),
    description: new FormControl('', {nonNullable: true}),
  });
  protected readonly savePromise = signal<Promise<void> | null>(null);

  protected mediaTypeSelected(prop: string): void {
    this.types.set(this.mediaTypes.find(mediaType => mediaType.prop === prop)?.types ?? []);
  }

  protected submit(): void {
    this.savePromise.set(this.save());
  }

  protected close(): void {
    this.dialogRef.close(false);
  }

  private async save(): Promise<void> {
    const {file, ...value} = this.form.getRawValue();
    if (!file) return;
    const result = await this.entities
      .uploadMedia(this.data.entityId, file, {...value, language: this.juicebox.getLanguage(), fileName: file.name})
      .catch(() => null);
    if (!result?.success) {
      this.juicebox.showToast('error', this.i18n.transform('error'), result?.error);
      return;
    }
    this.dialogRef.close(true);
  }
}
