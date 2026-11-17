import {Component, inject, OnDestroy, OnInit, signal} from '@angular/core';
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
} from '../../../../../../ui-components';
import {PromiseButtonDirective} from '../../../../../shared/directives/PromiseButton';
import {JuiceboxService} from '../../../../../shared/services/Juicebox.service';
import {EntitiesService} from '../../../entities.service';
import {EntityMedia} from '../../../entities.types';
import {EntitiesTranslationPipe} from '../../../i18n/entities.translation';

export interface PreviewMediaDialogData {
  entityId: string;
  media: EntityMedia;
}

/**
 * Shows one file of a customer as an image and changes its title, its description (both in the admin's language)
 * or the file itself. Closes with `true` once the change is stored; a file that can't be read closes the dialog.
 */
@Component({
  selector: 'app-preview-media-dialog',
  templateUrl: './preview-media-dialog.component.html',
  styleUrl: './preview-media-dialog.component.scss',
  imports: [
    ReactiveFormsModule,
    DialogTitleComponent,
    DialogContentComponent,
    DialogActionsComponent,
    FormFieldComponent,
    LabelComponent,
    InputDirective,
    FileInputComponent,
    ButtonComponent,
    PromiseButtonDirective,
    EntitiesTranslationPipe,
  ],
  providers: [EntitiesTranslationPipe],
})
export class PreviewMediaDialogComponent implements OnInit, OnDestroy {
  private readonly entities = inject(EntitiesService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);
  private readonly data = inject<PreviewMediaDialogData>(DIALOG_DATA);
  private readonly i18n = inject(EntitiesTranslationPipe);
  private readonly language = this.juicebox.getLanguage();

  protected readonly media = this.data.media;
  protected readonly stored = {name: this.media.fileName};
  /** The file as an object URL, released when the dialog closes */
  protected readonly preview = signal<string | null>(null);
  protected readonly form = new FormGroup({
    title: new FormControl(this.localised(this.media.title), {nonNullable: true}),
    description: new FormControl(this.localised(this.media.description), {nonNullable: true}),
    file: new FormControl<File | null>(null),
  });
  protected readonly savePromise = signal<Promise<void> | null>(null);

  async ngOnInit(): Promise<void> {
    const result = await this.entities.downloadMedia(this.data.entityId, this.media._id);
    if (!result?.success || !result.payload?.data) {
      this.dialogRef.close(false);
      return;
    }
    this.preview.set(URL.createObjectURL(new Blob([new Uint8Array(result.payload.data)])));
  }

  ngOnDestroy(): void {
    const url = this.preview();
    if (url) URL.revokeObjectURL(url);
  }

  protected submit(): void {
    this.savePromise.set(this.save());
  }

  protected close(): void {
    this.dialogRef.close(false);
  }

  private async save(): Promise<void> {
    const {file, title, description} = this.form.getRawValue();
    const result = await this.entities
      .updateMedia(this.data.entityId, this.media._id, {title, description, language: this.language, fileName: file?.name}, file ?? undefined)
      .catch(() => null);
    if (!result?.success) {
      this.juicebox.showToast('error', this.i18n.transform('error'), result?.error);
      return;
    }
    this.dialogRef.close(true);
  }

  /** A text in the admin's language, or else in German */
  private localised(text: Record<string, string> | string | undefined): string {
    if (!text) return '';
    return typeof text === 'string' ? text : text[this.language] ?? text['de_DE'] ?? '';
  }
}
