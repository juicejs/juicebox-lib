import {Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {
  ButtonComponent,
  CellDefDirective,
  ColumnConfig,
  DataTableComponent,
  DialogService,
  ProgressSpinnerComponent,
} from '../../../../../ui-components';
import {EntitiesService} from '../../entities.service';
import {Entity, EntityFormFile} from '../../entities.types';
import {EntitiesTranslationPipe} from '../../i18n/entities.translation';
import {ImageViewerDialogComponent} from './image-viewer-dialog.component';

interface FileRow {
  _id: string;
  filename: string;
  /** The file as an object URL, released when the page is left */
  url: string;
}

/**
 * The files a customer sent with a form (`attributes.files`): the images with a thumbnail that opens the image, the
 * other files by name with a download, and an upload that sends a file to the forms module. No tab leads to this
 * page; it is kept for the projects that link to it.
 */
@Component({
  selector: 'app-documents-entity',
  templateUrl: './documents-entity.component.html',
  styleUrl: './documents-entity.component.scss',
  imports: [DataTableComponent, CellDefDirective, ButtonComponent, ProgressSpinnerComponent, EntitiesTranslationPipe],
  providers: [EntitiesTranslationPipe],
})
export class DocumentsEntityComponent implements OnInit, OnDestroy {
  private readonly entities = inject(EntitiesService);
  private readonly dialog = inject(DialogService);
  private readonly i18n = inject(EntitiesTranslationPipe);
  private readonly entityId: string = inject(ActivatedRoute).snapshot.parent?.params['id'];

  private readonly entity = signal<Entity | null>(null);
  protected readonly loading = signal(true);
  protected readonly hasFiles = computed(() => !!this.entity()?.attributes?.['files']);
  protected readonly images = signal<FileRow[]>([]);
  protected readonly documents = signal<FileRow[]>([]);
  private request = 0;

  protected readonly imageColumns: ColumnConfig[] = [{key: 'image', label: this.i18n.transform('image'), ellipsis: false}];
  protected readonly documentColumns: ColumnConfig[] = [
    {key: 'filename', label: this.i18n.transform('file_name')},
    {key: 'download', label: this.i18n.transform('download'), width: '140px', ellipsis: false},
  ];

  ngOnInit(): Promise<void> {
    return this.load();
  }

  ngOnDestroy(): void {
    this.release();
  }

  protected async upload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Lets the same file be chosen again
    input.value = '';
    if (!file) return;
    await this.entities.uploadFormImage(this.entity()?.form_data, file);
    await this.load();
  }

  protected openImage(row: FileRow): void {
    this.dialog.open<ImageViewerDialogComponent, string>(ImageViewerDialogComponent, {data: row.url, width: '81vw'});
  }

  protected download(row: FileRow): void {
    const link = document.createElement('a');
    link.href = row.url;
    link.download = row.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private async load(): Promise<void> {
    const request = ++this.request;
    const result = await this.entities.get(this.entityId);
    if (request !== this.request || !result?.success || !result.payload) return;
    this.entity.set(result.payload);
    this.loading.set(false);

    const stored = result.payload.attributes?.['files'];
    const files: EntityFormFile[] = Array.isArray(stored) ? stored : [];
    const rows = await Promise.all(files.map(async file => {
      const blob = await this.entities.fetchFile(this.entityId, file._id).catch(() => null);
      return blob ? {file, row: {_id: file._id, filename: file.name ?? '', url: URL.createObjectURL(blob)}} : null;
    }));
    const read = rows.filter(row => row !== null);
    if (request !== this.request) {
      read.forEach(({row}) => URL.revokeObjectURL(row.url));
      return;
    }
    this.release();
    this.images.set(read.filter(({file}) => /image/.test(file.mimetype ?? '')).map(({row}) => row));
    this.documents.set(read.filter(({file}) => !/image/.test(file.mimetype ?? '')).map(({row}) => row));
  }

  private release(): void {
    [...this.images(), ...this.documents()].forEach(row => URL.revokeObjectURL(row.url));
  }
}
