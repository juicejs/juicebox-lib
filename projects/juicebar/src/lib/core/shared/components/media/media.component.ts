import {
  Component, InputSignal, OnInit, booleanAttribute, computed, inject, input, linkedSignal, output, signal,
} from '@angular/core';
import {Clipboard} from '@angular/cdk/clipboard';
import {
  ButtonComponent,
  CellDefDirective,
  ColumnConfig,
  DataTableComponent,
  DialogService,
  IconComponent,
  TooltipDirective,
} from '../../../../ui-components';
import {AutoLanguagePipe} from '../../pipes/auto-language.pipe';
import {ConfigurationService} from '../../services/configuration.service';
import {JuiceboxService} from '../../services/Juicebox.service';
import {ConfirmationDialogComponent, ConfirmationDialogData} from '../confirmation-dialog/confirmation-dialog.component';
import {AddMediaComponent, AddMediaData} from './add-media/add-media.component';
import {EditMediaComponent, EditMediaData} from './edit-media/edit-media.component';
import {MediaTranslationPipe} from './i18n/media.translation';
import {escapeHtml, fileUrl, isPreviewable, textIn} from './media-files';
import {MediaDetails, MediaFile, MediaRecord, MediaType, MediaUpdate} from './media.types';

interface MediaRow {
  /** The file's id, so the table keeps a row's view (and focus) when it moves */
  _id?: string;
  file: MediaFile;
  /** Address of the stored file */
  url: string | null;
  previewable: boolean;
}

interface Preview {
  url: string;
  video: boolean;
  alt: string;
}

/**
 * A record's files, as the old juicebox `app-media`: uploaded under the media types of the `media` configuration's
 * `collection`, previewed (images and videos) or downloaded, edited, reordered and deleted. The component changes
 * nothing on the record: it emits what happened, and the module stores it with its own service (`addMedia`,
 * `updateMedia`, `removeMedia`, or the whole list when sorted) and passes the record back in `model`.
 */
@Component({
  selector: 'app-media',
  templateUrl: './media.component.html',
  styleUrl: './media.component.scss',
  imports: [
    DataTableComponent,
    CellDefDirective,
    ButtonComponent,
    IconComponent,
    TooltipDirective,
    AutoLanguagePipe,
    MediaTranslationPipe,
  ],
  providers: [MediaTranslationPipe],
})
export class MediaComponent implements OnInit {
  private readonly configuration = inject(ConfigurationService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly dialog = inject(DialogService);
  private readonly clipboard = inject(Clipboard);
  private readonly i18n = inject(MediaTranslationPipe);
  private readonly language = this.juicebox.getLanguage();
  private readonly endpoint = this.juicebox.getEndPoint();

  // The nullable inputs are typed explicitly: the lib is compiled without strict null checks, which would take the
  // null out of their published types, and a strict project could not pass one
  /** The `media` configuration's collection: its media types, and where the files are stored */
  readonly collection = input.required<string>();
  /** The record's id; its files are stored under it */
  readonly reference: InputSignal<string | null | undefined> = input<string | null | undefined>();
  /** The record, whose `media` are listed */
  readonly model: InputSignal<MediaRecord | null | undefined> = input<MediaRecord | null | undefined>();
  /** Asked before a delete, in place of "Delete media "…"?" */
  readonly confirmationMessage: InputSignal<string | undefined> =
    input<string | undefined>(undefined, {alias: 'confirmation_message'});
  readonly enableCopyUrl = input(false, {transform: booleanAttribute});
  /** No more files can be added once the record has this many */
  readonly limit: InputSignal<number | null | undefined> = input<number | null | undefined>();
  readonly enableSort = input(false, {transform: booleanAttribute});
  /** The files the picker takes, as in the native `accept`, e.g. `['.png, .jpg, .jpeg, .svg']` */
  readonly acceptedTypes = input<string | string[]>(['.png, .jpg, .jpeg, .svg']);
  readonly hideEditButton = input(false, {transform: booleanAttribute});
  readonly hideDeleteButton = input(false, {transform: booleanAttribute});
  readonly hideAddButton = input(false, {transform: booleanAttribute});

  /** A file was uploaded: the stored file, for the record to add */
  readonly saved = output<MediaFile>();
  /** A file's details were edited */
  readonly updated = output<MediaUpdate>();
  /** A file is to be taken off the record (after the user confirmed) */
  readonly removed = output<MediaFile>();
  /** The record's files in their new order */
  readonly sorted = output<MediaFile[]>();
  readonly urlCopied = output<string>();

  private readonly mediaTypes = signal<MediaType[]>([]);
  /** The record's files; a move shows at once, before the record comes back */
  private readonly files = linkedSignal(() => this.model()?.media ?? []);
  protected readonly rows = computed<MediaRow[]>(() =>
    this.files().map(file => ({
      _id: file._id,
      file,
      url: fileUrl(file.fullPath, this.endpoint),
      previewable: isPreviewable(file.mimeType),
    })));
  /** Every file on one page, as the old table showed them */
  protected readonly pageSize = computed(() => Math.max(1, this.rows().length));
  protected readonly pageSizeOptions: number[] = [];
  protected readonly preview = signal<Preview | null>(null);
  protected readonly addDisabled = computed(() => {
    const limit = this.limit();
    return this.hideAddButton() || !this.reference() || (!!limit && this.files().length >= limit);
  });

  private readonly orderColumn: ColumnConfig =
    {key: 'order', label: this.i18n.transform('order'), width: '104px', ellipsis: false, resizable: false};
  private readonly fileColumns: ColumnConfig[] = [
    {key: 'name', label: this.i18n.transform('name')},
    {key: 'mediaType', label: this.i18n.transform('media_type')},
    {key: 'type', label: this.i18n.transform('type')},
    {key: 'fileName', label: this.i18n.transform('file_name')},
    {key: 'actions', label: this.i18n.transform('actions'), width: '176px', align: 'right', ellipsis: false},
  ];
  protected readonly columns = computed(() =>
    this.enableSort() ? [this.orderColumn, ...this.fileColumns] : this.fileColumns);

  async ngOnInit(): Promise<void> {
    // Without the configuration (or when it can't be read) there are no media types, and nothing can be added
    const result = await this.configuration.getByKey('media').catch(() => null);
    const collections: {name: string; mediaTypes?: MediaType[]}[] = result?.success
      ? (result.payload?.options?.collections ?? [])
      : [];
    this.mediaTypes.set(collections.find(collection => collection.name === this.collection())?.mediaTypes ?? []);
  }

  /** A click on an image or video shows it next to the table; on another file it hides the preview */
  protected select(row: MediaRow): void {
    const {file, url} = row;
    this.preview.set(row.previewable && url ? {
      url,
      video: !!file.mimeType?.startsWith('video'),
      alt: textIn(file.alt_text, this.language) || file.fileName || '',
    } : null);
  }

  protected add(): void {
    const accepted = this.acceptedTypes();
    this.dialog
      .open<AddMediaComponent, AddMediaData, MediaFile>(AddMediaComponent, {
        data: {
          collection: this.collection(),
          reference: this.reference() ?? '',
          mediaTypes: this.mediaTypes(),
          accept: Array.isArray(accepted) ? accepted.join(',') : accepted,
        },
        width: '560px',
      })
      .closed.subscribe(file => {
        if (file) this.saved.emit(file);
      });
  }

  protected edit(row: MediaRow): void {
    const reference = row.file._id;
    if (!reference) return;
    this.dialog
      .open<EditMediaComponent, EditMediaData, MediaDetails>(EditMediaComponent, {
        data: {file: row.file, mediaTypes: this.mediaTypes()},
        width: '560px',
      })
      .closed.subscribe(data => {
        if (data) this.updated.emit({reference, data});
      });
  }

  protected remove(row: MediaRow): void {
    const custom = this.confirmationMessage();
    // The dialog reads its message as HTML; the file's own title is shown as text
    const title = escapeHtml(textIn(row.file.title, this.language) || row.file.fileName || '');
    const data: ConfirmationDialogData = custom
      ? {completeMessage: custom, excludeQuestionMark: true, confirm: 'delete', destructive: true}
      : {completeMessage: `${this.i18n.transform('delete_media')} "${title}"`, confirm: 'delete', destructive: true};
    this.dialog
      .open<ConfirmationDialogComponent, ConfirmationDialogData, boolean>(ConfirmationDialogComponent, {data})
      .closed.subscribe(confirmed => {
        if (!confirmed) return;
        this.preview.set(null);
        this.removed.emit(row.file);
      });
  }

  /** Moves the file one place up or down; the first moves up to the end, the last down to the start */
  protected move(row: MediaRow, step: -1 | 1): void {
    const files = [...this.files()];
    const from = files.indexOf(row.file);
    if (from < 0) return;
    const to = (from + step + files.length) % files.length;
    files.splice(to, 0, ...files.splice(from, 1));
    this.files.set(files);
    this.sorted.emit(files);
  }

  protected copyUrl(row: MediaRow): void {
    if (!row.url) return;
    this.clipboard.copy(row.url);
    this.juicebox.showToast('success', this.i18n.transform('copy_url_success'));
    this.urlCopied.emit(row.url);
  }
}
