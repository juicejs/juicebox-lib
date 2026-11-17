import {Component, inject, OnInit, signal} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {ButtonComponent, CellDefDirective, ColumnConfig, DataTableComponent} from '../../../../../ui-components';
import {fileUrl} from '../../../../shared/components/media/media-files';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {EntitiesService} from '../../entities.service';
import {EntitiesTranslationPipe} from '../../i18n/entities.translation';

interface ImageRow {
  _id: string;
  url: string;
}

/**
 * A customer's images, such as an organisation's logo: "Select image" adds one, which the backend stores in three
 * sizes, and the list shows them small. No tab leads to this page; it is kept for the projects that link to it.
 */
@Component({
  selector: 'app-logo-entities',
  templateUrl: './addlogo-entities.component.html',
  styleUrl: './addlogo-entities.component.scss',
  imports: [DataTableComponent, CellDefDirective, ButtonComponent, EntitiesTranslationPipe],
  providers: [EntitiesTranslationPipe],
})
export class AddlogoEntitiesComponent implements OnInit {
  private readonly entities = inject(EntitiesService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly i18n = inject(EntitiesTranslationPipe);
  private readonly entityId: string = inject(ActivatedRoute).snapshot.parent?.params['id'];
  private readonly endpoint = this.juicebox.getEndPoint();

  protected readonly images = signal<ImageRow[]>([]);
  protected readonly uploading = signal(false);
  protected readonly columns: ColumnConfig[] = [{key: 'image', label: this.i18n.transform('image'), ellipsis: false}];

  ngOnInit(): Promise<void> {
    return this.load();
  }

  protected async upload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const image = input.files?.[0];
    // Lets the same image be chosen again
    input.value = '';
    // As the old page: only an image is taken
    if (!image || !image.type.startsWith('image')) return;
    this.uploading.set(true);
    const result = await this.entities.uploadImage(this.entityId, image).catch(() => null);
    this.uploading.set(false);
    if (!result?.success) {
      this.juicebox.showToast('error', this.i18n.transform('error'), result?.error);
      return;
    }
    await this.load();
  }

  private async load(): Promise<void> {
    const result = await this.entities.get(this.entityId);
    if (!result?.success || !result.payload) return;
    this.images.set((result.payload.images ?? []).map(image => ({_id: image._id, url: fileUrl(image.small, this.endpoint)})));
  }
}
