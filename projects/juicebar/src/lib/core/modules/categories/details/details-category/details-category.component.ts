import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {firstValueFrom} from 'rxjs';
import {ButtonComponent, DialogService} from '../../../../../ui-components';
import {ConfirmationDialogComponent, ConfirmationDialogData} from '../../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import {PromiseButtonDirective} from '../../../../shared/directives/PromiseButton';
import {ConfigurationService} from '../../../../shared/services/configuration.service';
import {Juice} from '../../../../shared/services/juice.service';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {
  CategoriesConfiguration,
  deleteRestricted,
  injectCategoriesOptions,
  loadCategoriesConfiguration,
  loadRelatedOrganisations,
  SUPER_ADMIN,
} from '../../categories-shared';
import {CategoriesService} from '../../categories.service';
import {Category, CategoryUsage} from '../../categories.types';
import {CategoryFieldsComponent} from '../../category-fields/category-fields.component';
import {categoryData, categoryFormValue, createCategoryForm} from '../../category-form';
import {CategoriesTranslationPipe} from '../../i18n/categories.translation';

/** What the deactivation warning names, with its label */
const USAGE_LABELS: Array<[keyof CategoryUsage, string]> = [
  ['qualifications', 'qualifications'],
  ['modules', 'modules'],
  ['trainings', 'trainings'],
  ['educations', 'educations'],
  ['templates', 'training_templates'],
  ['occupations', 'occupations'],
  ['functions', 'functions'],
];

/**
 * A category's fields in the user's language. Quality Circle's extras: with showPublic the public switch, saving only
 * categories of the user's organisation tree and taking another organisation's category into Mine; with
 * `confirmDeactivation` a warning before switching a category off.
 */
@Component({
  selector: 'app-details-category',
  templateUrl: './details-category.component.html',
  imports: [CategoryFieldsComponent, ButtonComponent, PromiseButtonDirective, CategoriesTranslationPipe],
  providers: [CategoriesTranslationPipe],
})
export class DetailsCategoryComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly categories = inject(CategoriesService);
  private readonly configuration = inject(ConfigurationService);
  private readonly juice = inject(Juice);
  private readonly juicebox = inject(JuiceboxService);
  private readonly dialog = inject(DialogService);
  private readonly i18n = inject(CategoriesTranslationPipe);
  private readonly options = injectCategoriesOptions();
  private readonly language = this.juicebox.getLanguage();
  private readonly canUpdate = !!this.juicebox.hasPermission('categories:role#update');
  private readonly superAdminPermission = !!this.juicebox.hasPermission(SUPER_ADMIN);

  /** Also read by the unsaved changes guard */
  protected readonly form = createCategoryForm();
  protected readonly category = signal<Category | null>(null);
  protected readonly config = signal<CategoriesConfiguration>({});
  private readonly organisationId = signal<string | null>(null);
  /** Quality Circle: the category's organisation isn't in the user's organisation tree */
  private readonly outsideOrganisation = signal(false);
  protected readonly savePromise = signal<Promise<void>>(Promise.resolve());
  protected readonly transferPromise = signal<Promise<void>>(Promise.resolve());

  /** With allowDelete off, as in Quality Circle: a super admin saves any category; the others don't see its active switch without an organisation */
  private readonly superAdmin = computed(() => deleteRestricted(this.config()) && this.superAdminPermission);
  protected readonly showActive = computed(() =>
    !(deleteRestricted(this.config()) && !this.superAdminPermission) || !!this.category()?.organisation_id);
  protected readonly saveDisabled = computed(() => {
    if (this.superAdmin()) return false;
    return !this.canUpdate || this.category()?.type === 'no_category' || this.outsideOrganisation();
  });
  protected readonly showTransfer = computed(() => {
    const category = this.category();
    return !!this.config().showPublic && !!category && category.type !== 'no_category'
      && String(category.organisation_id) !== String(this.organisationId());
  });
  protected readonly transferDisabled = computed(() => {
    const organisationId = this.organisationId();
    return !this.canUpdate || !!this.category()?.custom_category_organisation_ids?.some(id => String(id) === String(organisationId));
  });

  async ngOnInit(): Promise<void> {
    const id = this.route.parent?.snapshot.paramMap.get('id');
    if (!id) return;
    const [config, organisation, result] = await Promise.all([
      loadCategoriesConfiguration(this.configuration),
      this.juicebox.getLoggedInOrganisation(),
      this.categories.getCategory(id),
    ]);
    this.config.set(config);
    this.organisationId.set(organisation?._id ?? null);
    if (!result?.success || !result.payload) return;
    const category = result.payload;
    if (config.showPublic) {
      const related = await loadRelatedOrganisations(this.juice);
      this.outsideOrganisation.set(!related.includes(String(category.organisation_id)));
    }
    this.form.reset(categoryFormValue(category, this.language));
    this.category.set(category);
  }

  protected save(): void {
    this.savePromise.set(this.update());
  }

  protected transfer(): void {
    this.transferPromise.set(this.addToMine());
  }

  private async update(): Promise<void> {
    const category = this.category();
    this.form.markAllAsTouched();
    if (!category || this.form.invalid) return;
    if (!(await this.confirmDeactivation(category))) return;

    const result = await this.categories.updateCategory(category._id, categoryData(this.form, !!this.config().showPublic), this.language);
    if (!result?.success) {
      this.juicebox.showToast('error', this.i18n.transform('category_update_failed'));
      const error = result?.error ?? '';
      if (error.includes('permission') || error.includes('role')) this.juicebox.showToast('error', error);
      return;
    }
    // The stored category, so the next save compares with it
    if (result.payload) this.category.set(result.payload);
    this.form.markAsPristine();
    this.juicebox.showToast('success', this.i18n.transform('category_updated'));
  }

  /**
   * Quality Circle: a deactivated category leaves every selection list but stays on what uses it, so it asks first.
   * Cancelling switches it back on.
   */
  private async confirmDeactivation(category: Category): Promise<boolean> {
    if (!this.options.confirmDeactivation || !category.active || this.form.controls.active.value) return true;
    const data: ConfirmationDialogData = {
      completeMessage: this.i18n.transform('deactivate_category_question'),
      excludeQuestionMark: true,
      info: await this.deactivationWarning(category._id),
    };
    const confirmed = await firstValueFrom(
      this.dialog.open<ConfirmationDialogComponent, ConfirmationDialogData, boolean>(ConfirmationDialogComponent, {data}).closed,
    );
    if (!confirmed) this.form.controls.active.setValue(true);
    return !!confirmed;
  }

  /** Names the features that still use the category, only those with any */
  private async deactivationWarning(categoryId: string): Promise<string> {
    const usage = await this.categories.getCategoryUsage(categoryId);
    if (!usage) return this.i18n.transform('category_usage_unknown');
    const list = USAGE_LABELS
      .filter(([key]) => usage[key] > 0)
      .map(([key, label]) => `${usage[key]} ${this.i18n.transform(label)}`)
      .join(', ');
    return list ? this.i18n.transform('category_in_use_list', {list}) : this.i18n.transform('deactivate_category_confirm');
  }

  private async addToMine(): Promise<void> {
    const category = this.category();
    const organisationId = this.organisationId();
    if (!category || !organisationId) return;
    const result = await this.categories.addToCustomCategory(category._id);
    if (!result?.success) {
      this.juicebox.showToast('error', result?.error || this.i18n.transform('error_adding_category'));
      return;
    }
    this.category.set({
      ...category,
      custom_category_organisation_ids: [...(category.custom_category_organisation_ids ?? []), organisationId],
    });
    this.juicebox.showToast('success', this.i18n.transform('category_added_to_mine'));
  }
}
