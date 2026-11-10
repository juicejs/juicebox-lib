import {Component, input, output} from '@angular/core';
import {ReactiveFormsModule} from '@angular/forms';
import {
  CardComponent,
  ErrorComponent,
  FormFieldComponent,
  InputDirective,
  LabelComponent,
  SlideToggleComponent,
} from '../../../../ui-components';
import {CategoryForm} from '../category-form';
import {CategoriesTranslationPipe} from '../i18n/categories.translation';

/** A category's fields, for the create page and the details tab. The page's buttons go inside. */
@Component({
  selector: 'app-category-fields',
  templateUrl: './category-fields.component.html',
  styleUrl: './category-fields.component.scss',
  imports: [
    ReactiveFormsModule,
    CardComponent,
    FormFieldComponent,
    LabelComponent,
    ErrorComponent,
    InputDirective,
    SlideToggleComponent,
    CategoriesTranslationPipe,
  ],
  providers: [CategoriesTranslationPipe],
})
export class CategoryFieldsComponent {
  readonly form = input.required<CategoryForm>();
  readonly title = input.required<string>();
  /** Quality Circle (showPublic): the public switch */
  readonly showPublic = input(false);
  readonly showActive = input(true);

  readonly submitted = output<void>();
}
