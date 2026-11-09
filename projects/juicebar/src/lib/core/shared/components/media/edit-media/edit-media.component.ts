import {Component, inject} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {DIALOG_DATA, DialogRef} from '@angular/cdk/dialog';
import {
  ButtonComponent,
  DialogActionsComponent,
  DialogContentComponent,
  DialogTitleComponent,
  FormFieldComponent,
  InputDirective,
  LabelComponent,
  OptionComponent,
  SelectComponent,
} from '../../../../../ui-components';
import {AutoLanguagePipe} from '../../../pipes/auto-language.pipe';
import {JuiceboxService} from '../../../services/Juicebox.service';
import {MediaTranslationPipe} from '../i18n/media.translation';
import {isPerLanguage, textIn, withText} from '../media-files';
import {MediaDetails, MediaFile, MediaText, MediaType} from '../media.types';

export interface EditMediaData {
  file: MediaFile;
  mediaTypes: MediaType[];
}

/** Edits a file's media type, name, description, title and alt text, and closes with the details for the record */
@Component({
  selector: 'app-edit-media',
  templateUrl: './edit-media.component.html',
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
    ButtonComponent,
    AutoLanguagePipe,
    MediaTranslationPipe,
  ],
})
export class EditMediaComponent {
  private readonly dialogRef = inject<DialogRef<MediaDetails>>(DialogRef);
  protected readonly data = inject<EditMediaData>(DIALOG_DATA);
  private readonly language = inject(JuiceboxService).getLanguage();

  protected readonly file = this.data.file;
  protected readonly form = new FormGroup({
    mediaType: new FormControl<string | null>(this.file.key ?? this.data.mediaTypes[0]?.key ?? null),
    name: new FormControl(textIn(this.file.name, this.language), {nonNullable: true}),
    description: new FormControl(textIn(this.file.description, this.language), {nonNullable: true}),
    title: new FormControl(textIn(this.file.title, this.language), {nonNullable: true}),
    altText: new FormControl(textIn(this.file.alt_text, this.language), {nonNullable: true}),
  });

  protected save(): void {
    const value = this.form.getRawValue();
    const details: MediaDetails = {
      name: this.edited(this.file.name, value.name),
      description: this.edited(this.file.description, value.description),
      // Title and alt text are per language: the other languages stay as they are
      title: withText(this.file.title, this.language, value.title),
      alt_text: withText(this.file.alt_text, this.language, value.altText),
    };
    const mediaType = this.data.mediaTypes.find(type => type.key === value.mediaType);
    if (mediaType) {
      details.key = mediaType.key;
      details.mediaType = mediaType.title;
    }
    this.dialogRef.close(details);
  }

  protected close(): void {
    this.dialogRef.close();
  }

  /** Name and description stay as the record keeps them: one text, or one per language */
  private edited(stored: MediaText | undefined, text: string): MediaText {
    return isPerLanguage(stored) ? withText(stored, this.language, text) : (text || null);
  }
}
