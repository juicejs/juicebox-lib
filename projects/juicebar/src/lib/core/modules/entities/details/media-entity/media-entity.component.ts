import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {
  ButtonComponent,
  CellDefDirective,
  ColumnConfig,
  DataTableComponent,
  DialogService,
  FormFieldComponent,
  IconComponent,
  LabelComponent,
  OptionComponent,
  SelectComponent,
  TooltipDirective,
} from '../../../../../ui-components';
import {ConfirmationDialogComponent, ConfirmationDialogData} from '../../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import {escapeHtml} from '../../../../shared/components/media/media-files';
import {HasPermissionDirective} from '../../../../shared/directives/HasPermissionDirective';
import {ConfigurationService} from '../../../../shared/services/configuration.service';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {translatedOr} from '../../entities-shared';
import {EntitiesService} from '../../entities.service';
import {EntityMedia, EntityMediaType} from '../../entities.types';
import {EntitiesTranslationPipe} from '../../i18n/entities.translation';
import {AddMediaDialogComponent, AddMediaDialogData} from './add-media/add-media-dialog.component';
import {PreviewMediaDialogComponent, PreviewMediaDialogData} from './preview-media/preview-media-dialog.component';

/**
 * The Media tab: the customer's files of the media type chosen in "Filter" (none without a choice, as in the old
 * tab), with adding a file, opening one to change it and deleting one. The media types and their kinds come from
 * the `entities` configuration. The customer is read again after each change.
 */
@Component({
  selector: 'app-media-entity',
  templateUrl: './media-entity.component.html',
  styleUrl: './media-entity.component.scss',
  imports: [
    DataTableComponent,
    CellDefDirective,
    FormFieldComponent,
    LabelComponent,
    SelectComponent,
    OptionComponent,
    ButtonComponent,
    IconComponent,
    TooltipDirective,
    HasPermissionDirective,
    EntitiesTranslationPipe,
  ],
  providers: [EntitiesTranslationPipe],
})
export class MediaEntityComponent implements OnInit {
  private readonly entities = inject(EntitiesService);
  private readonly configuration = inject(ConfigurationService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly dialog = inject(DialogService);
  private readonly i18n = inject(EntitiesTranslationPipe);
  private readonly entityId: string = inject(ActivatedRoute).snapshot.parent?.params['id'];

  /** The configured media types, named in the admin's language */
  protected readonly filters = signal<EntityMediaType[]>([]);
  protected readonly selectedFilter = signal<string | null>(null);
  private readonly media = signal<EntityMedia[]>([]);
  protected readonly rows = computed(() => {
    const filter = this.selectedFilter();
    return filter ? this.media().filter(file => file.mediaType === filter) : [];
  });

  protected readonly columns: ColumnConfig[] = [
    {key: 'fileName', label: this.i18n.transform('name')},
    {key: 'type', label: this.i18n.transform('type')},
    {key: 'attributes.fileSize', label: this.i18n.transform('size')},
    {key: 'attributes.fileType', label: this.i18n.transform('file_type')},
    {key: 'actions', label: this.i18n.transform('actions'), width: '80px', align: 'right', ellipsis: false},
  ];

  async ngOnInit(): Promise<void> {
    this.juicebox.setActionButtons([{
      title: this.i18n.transform('add_media'),
      icon: 'add',
      type: 'btn-primary',
      callback: () => this.add(),
    }]);
    const [, configuration] = await Promise.all([this.load(), this.configuration.getByKey('entities')]);
    const mediaTypes: EntityMediaType[] = configuration?.payload?.options?.mediaTypes ?? [];
    this.filters.set(mediaTypes.map(type => ({
      ...type,
      name: translatedOr(this.i18n, type.name),
      types: (type.types ?? []).map(kind => ({...kind, name: translatedOr(this.i18n, kind.name)})),
    })));
  }

  protected selectFilter(filter: string | null): void {
    this.selectedFilter.set(filter || null);
  }

  protected open(file: EntityMedia): void {
    this.dialog
      .open<PreviewMediaDialogComponent, PreviewMediaDialogData, boolean>(PreviewMediaDialogComponent, {
        data: {entityId: this.entityId, media: file},
        // As in the old tab, neither a click outside nor Esc closes it
        disableClose: true,
        closeOnEscape: false,
      })
      .closed.subscribe(saved => {
        if (saved) void this.load();
      });
  }

  protected remove(file: EntityMedia): void {
    const data: ConfirmationDialogData = {
      completeMessage: `${this.i18n.transform('delete_media')} "${escapeHtml(file.fileName)}" `,
      confirm: 'delete',
      destructive: true,
    };
    this.dialog
      .open<ConfirmationDialogComponent, ConfirmationDialogData, boolean>(ConfirmationDialogComponent, {data})
      .closed.subscribe(async confirmed => {
        if (!confirmed) return;
        const result = await this.entities.deleteMedia(this.entityId, file._id);
        if (!result?.success) {
          this.juicebox.showToast('error', this.i18n.transform('error'), result?.error);
          return;
        }
        await this.load();
      });
  }

  private add(): void {
    this.dialog
      .open<AddMediaDialogComponent, AddMediaDialogData, boolean>(AddMediaDialogComponent, {
        data: {entityId: this.entityId, mediaTypes: this.filters()},
        // As in the old tab, neither a click outside nor Esc closes it
        disableClose: true,
        closeOnEscape: false,
      })
      .closed.subscribe(saved => {
        if (saved) void this.load();
      });
  }

  private async load(): Promise<void> {
    const result = await this.entities.get(this.entityId);
    if (result?.success && result.payload) this.media.set(result.payload.media ?? []);
  }
}
