import {Component, inject, OnInit, signal} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {MediaComponent} from '../../../../shared/components/media/media.component';
import {MediaFile, MediaRecord, MediaUpdate} from '../../../../shared/components/media/media.types';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {Result} from '../../../../shared/types/Result';
import {LocationsTranslationPipe} from '../../i18n/locations.translation';
import {LocationsService} from '../../locations.service';

/** Documents are the location's files with this media type key; the media tab shows the others */
const DOCUMENT_KEY = 'standard:document';

/**
 * The location's media or, with route data `documents`, its documents: stored in the `locations` or
 * `locations_documents` collection and added to, edited on and removed from the location
 */
@Component({
  selector: 'app-location-media',
  templateUrl: './location-media.component.html',
  imports: [MediaComponent],
  providers: [LocationsTranslationPipe],
})
export class LocationMediaComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly locations = inject(LocationsService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly i18n = inject(LocationsTranslationPipe);

  protected readonly documents = !!this.route.snapshot.data['documents'];
  protected readonly locationId = this.route.parent?.snapshot.paramMap.get('id') ?? null;
  /** The location with this tab's files only */
  protected readonly record = signal<MediaRecord | null>(null);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async added(file: MediaFile): Promise<void> {
    if (!this.locationId) return;
    const result = await this.locations.addMedia(this.locationId, file);
    if (this.failed(result)) return;
    this.juicebox.showToast('success', this.i18n.transform(this.documents ? 'document_was_added' : 'image_was_added'));
    await this.load();
  }

  protected async removed(file: MediaFile): Promise<void> {
    if (!this.locationId) return;
    const result = await this.locations.removeMedia(this.locationId, file);
    if (this.failed(result)) return;
    await this.load();
  }

  protected async updated({reference, data}: MediaUpdate): Promise<void> {
    if (!this.locationId) return;
    const result = await this.locations.updateMedia(this.locationId, reference, data);
    if (this.failed(result)) return;
    this.juicebox.showToast('success', this.i18n.transform('media_was_updated'));
    await this.load();
  }

  private async load(): Promise<void> {
    if (!this.locationId) return;
    const result = await this.locations.get(this.locationId);
    if (!result?.success || !result.payload) return;
    const media = (result.payload.media ?? []).filter(file => (file.key === DOCUMENT_KEY) === this.documents);
    this.record.set({media});
  }

  /** Shows the service's error */
  private failed(result: Result | undefined): boolean {
    if (result?.success) return false;
    this.juicebox.showToast('error', result?.error || this.i18n.transform('saving_failed'));
    return true;
  }
}
