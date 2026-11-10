import {Component, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {Router} from '@angular/router';
import {ButtonComponent} from '../../../../ui-components';
import {HasPermissionDirective} from '../../../shared/directives/HasPermissionDirective';
import {PromiseButtonDirective} from '../../../shared/directives/PromiseButton';
import {ConfigurationService} from '../../../shared/services/configuration.service';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {loadCategoriesConfiguration} from '../categories-shared';
import {CategoriesService} from '../categories.service';
import {CategoryFieldsComponent} from '../category-fields/category-fields.component';
import {categoryData, createCategoryForm} from '../category-form';
import {CategoriesTranslationPipe} from '../i18n/categories.translation';

/** Creates a first-level category in the user's language and goes back to the tree */
@Component({
  selector: 'app-category-wizard',
  templateUrl: './category-wizard.component.html',
  imports: [CategoryFieldsComponent, ButtonComponent, HasPermissionDirective, PromiseButtonDirective, CategoriesTranslationPipe],
  providers: [CategoriesTranslationPipe],
})
export class CategoryWizardComponent implements OnInit, OnDestroy {
  private readonly categories = inject(CategoriesService);
  private readonly configuration = inject(ConfigurationService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly router = inject(Router);
  private readonly i18n = inject(CategoriesTranslationPipe);

  /** Also read by the unsaved changes guard */
  protected readonly form = createCategoryForm();
  protected readonly showPublic = signal(false);
  protected readonly createPromise = signal<Promise<void>>(Promise.resolve());

  async ngOnInit(): Promise<void> {
    this.juicebox.navigationEvent({
      location: this.i18n.transform('category'),
      subject: this.i18n.transform('create_category'),
      link: '/main/categories',
    });
    this.juicebox.setPageHeader({scope: '/main/categories/category-wizard', title: this.i18n.transform('create_category')});
    this.showPublic.set(!!(await loadCategoriesConfiguration(this.configuration)).showPublic);
  }

  ngOnDestroy(): void {
    this.juicebox.setPageHeader(null);
  }

  protected create(): void {
    this.createPromise.set(this.save());
  }

  private async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const result = await this.categories.createCategory(categoryData(this.form, this.showPublic()), this.juicebox.getLanguage());
    if (!result?.success) {
      this.juicebox.showToast('error', this.i18n.transform('category_create_failed'));
      return;
    }
    this.juicebox.showToast('success', this.i18n.transform('category_created'));
    this.form.markAsPristine();
    await this.router.navigateByUrl('/main/categories');
  }
}
