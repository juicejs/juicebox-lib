import {Component, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed, toSignal} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {DIALOG_DATA, DialogRef} from '@angular/cdk/dialog';
import {
  ButtonComponent,
  DialogActionsComponent,
  DialogContentComponent,
  DialogTitleComponent,
  FileInputComponent,
  FormFieldComponent,
  InputDirective,
  LabelComponent,
  OptionComponent,
  SelectComponent,
} from '../../../../../ui-components';
import {PromiseButtonDirective} from '../../../directives/PromiseButton';
import {AutoLanguagePipe} from '../../../pipes/auto-language.pipe';
import {Juice} from '../../../services/juice.service';
import {JuiceboxService} from '../../../services/Juicebox.service';
import {Result} from '../../../types/Result';
import {MediaTranslationPipe} from '../i18n/media.translation';
import {textIn} from '../media-files';
import {MediaFile, MediaType} from '../media.types';

export interface AddMediaData {
  collection: string;
  reference: string;
  mediaTypes: MediaType[];
  /** The files the picker takes, as in the native `accept` */
  accept: string;
}

/**
 * Uploads a file to the collection with the media service, under a media type and its kind of file, and closes
 * with the stored file for the record to add
 */
@Component({
  selector: 'app-add-media',
  templateUrl: './add-media.component.html',
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
    AutoLanguagePipe,
    MediaTranslationPipe,
  ],
  providers: [MediaTranslationPipe],
})
export class AddMediaComponent {
  private readonly juice = inject(Juice);
  private readonly juicebox = inject(JuiceboxService);
  private readonly i18n = inject(MediaTranslationPipe);
  private readonly dialogRef = inject<DialogRef<MediaFile>>(DialogRef);
  protected readonly data = inject<AddMediaData>(DIALOG_DATA);
  private readonly language = this.juicebox.getLanguage();

  protected readonly form = new FormGroup({
    mediaType: new FormControl<string | null>(this.data.mediaTypes[0]?.key ?? null, Validators.required),
    type: new FormControl<string | null>(null, Validators.required),
    file: new FormControl<File | null>(null, Validators.required),
    name: new FormControl('', {nonNullable: true}),
    description: new FormControl('', {nonNullable: true}),
    title: new FormControl('', {nonNullable: true}),
    altText: new FormControl('', {nonNullable: true}),
  });

  private readonly mediaTypeKey = toSignal(this.form.controls.mediaType.valueChanges, {
    initialValue: this.form.controls.mediaType.value,
  });
  private readonly typeName = toSignal(this.form.controls.type.valueChanges, {initialValue: null});
  private readonly mediaType = computed(() => this.data.mediaTypes.find(type => type.key === this.mediaTypeKey()) ?? null);
  /** The picked media type's kinds of file; the rest of the form shows once there are some */
  protected readonly types = computed(() => this.mediaType()?.types ?? []);
  private readonly type = computed(() => this.types().find(type => type.name === this.typeName()) ?? null);
  protected readonly typeDescription = computed(() => textIn(this.type()?.options?.description, this.language));
  /** The media service refuses a larger file; without the option its own limit applies */
  protected readonly maxSize = computed(() => this.type()?.options?.maxByteFileSize);
  protected readonly status = toSignal(this.form.statusChanges, {initialValue: this.form.status});
  protected readonly savePromise = signal<Promise<void>>(Promise.resolve());
  protected readonly uploading = signal(false);

  constructor() {
    // A media type brings its kinds of file: the first one is picked, as in the old dialog
    this.form.controls.mediaType.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.pickFirstType());
    this.pickFirstType();
  }

  protected save(): void {
    this.savePromise.set(this.store());
  }

  protected close(): void {
    this.dialogRef.close();
  }

  private pickFirstType(): void {
    this.form.controls.type.setValue(this.types()[0]?.name ?? null);
  }

  private async store(): Promise<void> {
    const mediaType = this.mediaType();
    const {type, file, name, description, title, altText} = this.form.getRawValue();
    if (!mediaType || !file || this.form.invalid) return;

    // The details as the old dialog sent them; the media service names the stored file after `file`
    const details = {
      mediaType: mediaType.title,
      key: mediaType.key,
      type,
      file: file.name,
      name: name || null,
      description: description || null,
      ...(title && {title: {[this.language]: title}}),
      ...(altText && {alt_text: {[this.language]: altText}}),
    };

    // The dialog stays open until the upload is done: closed earlier, the stored file would never reach the record
    this.uploading.set(true);
    this.dialogRef.disableClose = true;
    let result: Result<MediaFile> | false;
    try {
      result = await this.juice.request('media', 'store', [this.data.collection, this.data.reference, details], file);
    } catch {
      // A server error: the request tells only a file too large or a lost connection itself
      result = {success: false, error: this.i18n.transform('upload_failed')};
    }
    this.uploading.set(false);
    this.dialogRef.disableClose = false;
    if (!result || !result.success || !result.payload) {
      if (result && result.error) this.juicebox.showToast('error', result.error);
      return;
    }
    this.dialogRef.close(result.payload);
  }
}
