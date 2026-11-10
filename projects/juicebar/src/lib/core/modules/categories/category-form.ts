import {FormControl, FormGroup, Validators} from '@angular/forms';
import {PerLanguage} from '../../shared/components/media/media.types';
import {Category, CategoryUpdate} from './categories.types';

export type CategoryForm = FormGroup<{
  name: FormControl<string | null>;
  description: FormControl<string | null>;
  order: FormControl<string | number | null>;
  active: FormControl<boolean>;
  public: FormControl<boolean>;
}>;

/** The create page's and the details tab's fields; a new category is active, as in the old wizard */
export function createCategoryForm(): CategoryForm {
  return new FormGroup({
    name: new FormControl<string | null>(null, Validators.required),
    description: new FormControl<string | null>(null),
    order: new FormControl<string | number | null>(null),
    active: new FormControl(true, {nonNullable: true}),
    public: new FormControl(false, {nonNullable: true}),
  });
}

/** A stored category's values in the language edited */
export function categoryFormValue(category: Category, language: string): ReturnType<CategoryForm['getRawValue']> {
  return {
    name: inLanguage(category.name, language),
    description: inLanguage(category.description, language),
    order: category.order ?? '',
    active: !!category.active,
    public: !!category.public,
  };
}

/** What the old pages sent: the form's fields, `public` only where the backend configuration has it (showPublic) */
export function categoryData(form: CategoryForm, showPublic: boolean): CategoryUpdate {
  const {public: isPublic, ...value} = form.getRawValue();
  return {...value, ...(showPublic && {public: isPublic})};
}

function inLanguage(text: PerLanguage | string | undefined, language: string): string {
  return text && typeof text === 'object' ? text[language] || '' : '';
}
