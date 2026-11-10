import {Component, inject, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {DIALOG_DATA, DialogRef} from '@angular/cdk/dialog';
import {
  ButtonComponent,
  DialogActionsComponent,
  DialogContentComponent,
  DialogTitleComponent,
  ErrorComponent,
  FormFieldComponent,
  InputDirective,
  LabelComponent,
  SlideToggleComponent,
} from '../../../../ui-components';
import {HasPermissionDirective} from '../../../shared/directives/HasPermissionDirective';
import {PromiseButtonDirective} from '../../../shared/directives/PromiseButton';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {injectCategoriesOptions} from '../categories-shared';
import {CategoriesService} from '../categories.service';
import {CategoryCreate} from '../categories.types';
import {CategoriesTranslationPipe} from '../i18n/categories.translation';

export interface ChildCategoryDialogData {
  parentId: string;
  /** The parent's number of children: the new one goes last */
  order: number;
  /** Quality Circle (showPublic): the category can be public */
  showPublic?: boolean;
}

/**
 * Creates a subcategory in the user's language and closes with its id. The order is the parent's last place (shown
 * counted from 1, as in the old dialog).
 */
@Component({
  selector: 'app-child-category-dialog',
  templateUrl: './child-category-dialog.component.html',
  styleUrl: './child-category-dialog.component.scss',
  imports: [
    ReactiveFormsModule,
    DialogTitleComponent,
    DialogContentComponent,
    DialogActionsComponent,
    FormFieldComponent,
    LabelComponent,
    ErrorComponent,
    InputDirective,
    SlideToggleComponent,
    ButtonComponent,
    HasPermissionDirective,
    PromiseButtonDirective,
    CategoriesTranslationPipe,
  ],
  providers: [CategoriesTranslationPipe],
})
export class ChildCategoryDialogComponent {
  private readonly categories = inject(CategoriesService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly dialogRef = inject<DialogRef<string>>(DialogRef);
  private readonly i18n = inject(CategoriesTranslationPipe);
  protected readonly data = inject<ChildCategoryDialogData>(DIALOG_DATA);

  protected readonly form = new FormGroup({
    name: new FormControl('', Validators.required),
    description: new FormControl<string | null>(null),
    order: new FormControl({value: this.data.order + 1, disabled: true}),
    active: new FormControl(!!injectCategoriesOptions().subcategoriesActive, {nonNullable: true}),
    public: new FormControl(false, {nonNullable: true}),
  });
  protected readonly createPromise = signal<Promise<void>>(Promise.resolve());

  protected create(): void {
    this.createPromise.set(this.save());
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  private async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    const data: CategoryCreate = {
      name: value.name,
      description: value.description,
      active: value.active,
      ...(this.data.showPublic && {public: value.public}),
      order: this.data.order,
      parent_id: this.data.parentId,
    };
    const result = await this.categories.createCategory(data, this.juicebox.getLanguage());
    if (!result?.success) {
      const error: unknown = result?.error;
      this.juicebox.showToast('error', typeof error === 'string' ? error : (error as {message?: string})?.message);
      return;
    }
    this.juicebox.showToast('success', this.i18n.transform('subcategory_created'));
    this.dialogRef.close(result.payload);
  }
}
