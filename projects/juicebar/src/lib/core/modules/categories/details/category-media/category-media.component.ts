import {Component, inject, OnInit, signal} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {MediaComponent} from '../../../../shared/components/media/media.component';
import {MediaFile, MediaRecord, MediaUpdate} from '../../../../shared/components/media/media.types';
import {ConfigurationService} from '../../../../shared/services/configuration.service';
import {Juice} from '../../../../shared/services/juice.service';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {Result} from '../../../../shared/types/Result';
import {loadCategoriesConfiguration, loadRelatedOrganisations, SUPER_ADMIN} from '../../categories-shared';
import {CategoriesService} from '../../categories.service';
import {CategoriesTranslationPipe} from '../../i18n/categories.translation';

/**
 * The category's media (`categories` collection), added to, edited on and removed from it. Quality Circle
 * (showPublic): only super admins change the media of a category outside the user's organisation tree.
 */
@Component({
  selector: 'app-category-media',
  templateUrl: './category-media.component.html',
  imports: [MediaComponent],
  providers: [CategoriesTranslationPipe],
})
export class CategoryMediaComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly categories = inject(CategoriesService);
  private readonly configuration = inject(ConfigurationService);
  private readonly juice = inject(Juice);
  private readonly juicebox = inject(JuiceboxService);
  private readonly i18n = inject(CategoriesTranslationPipe);
  private readonly superAdmin = !!this.juicebox.hasPermission(SUPER_ADMIN);

  protected readonly categoryId = this.route.parent?.snapshot.paramMap.get('id') ?? null;
  protected readonly record = signal<MediaRecord | null>(null);
  protected readonly locked = signal(false);

  async ngOnInit(): Promise<void> {
    if (!this.categoryId) return;
    const [config, result] = await Promise.all([
      loadCategoriesConfiguration(this.configuration),
      this.categories.getCategory(this.categoryId),
    ]);
    if (!result?.success || !result.payload) return;
    if (config.showPublic && !this.superAdmin) {
      const related = await loadRelatedOrganisations(this.juice);
      this.locked.set(!related.includes(String(result.payload.organisation_id)));
    }
    this.record.set({media: result.payload.media ?? []});
  }

  protected async added(file: MediaFile): Promise<void> {
    if (!this.categoryId) return;
    const result = await this.categories.addMedia(this.categoryId, file);
    if (this.failed(result)) return;
    this.juicebox.showToast('success', this.i18n.transform('image_was_added'));
    await this.load();
  }

  protected async removed(file: MediaFile): Promise<void> {
    if (!this.categoryId) return;
    const result = await this.categories.removeMedia(this.categoryId, file);
    if (this.failed(result)) return;
    await this.load();
  }

  protected async updated({reference, data}: MediaUpdate): Promise<void> {
    if (!this.categoryId) return;
    const result = await this.categories.updateMedia(this.categoryId, reference, data);
    if (this.failed(result)) return;
    this.juicebox.showToast('success', this.i18n.transform('media_was_updated'));
    await this.load();
  }

  private async load(): Promise<void> {
    if (!this.categoryId) return;
    const result = await this.categories.getCategory(this.categoryId);
    if (result?.success && result.payload) this.record.set({media: result.payload.media ?? []});
  }

  /** Shows the service's error */
  private failed(result: Result | undefined): boolean {
    if (result?.success) return false;
    const error = result?.error ? this.i18n.transform(result.error) : '';
    this.juicebox.showToast('error', typeof error === 'string' && error && !error.startsWith('@') ? error : this.i18n.transform('saving_failed'));
    return true;
  }
}
