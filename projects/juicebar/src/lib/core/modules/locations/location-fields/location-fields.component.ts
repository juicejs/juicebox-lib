import {Component, computed, inject, input, output} from '@angular/core';
import {ReactiveFormsModule} from '@angular/forms';
import {
  CardComponent,
  ErrorComponent,
  FormFieldComponent,
  InputDirective,
  LabelComponent,
  OptionComponent,
  SelectComponent,
  SlideToggleComponent,
} from '../../../../ui-components';
import {LocationsOptions} from '../../../../config/base-app.config';
import {AutoLanguagePipe} from '../../../shared/pipes/auto-language.pipe';
import {LocationsTranslationPipe} from '../i18n/locations.translation';
import {LocationForm} from '../location-form';
import {CountryOption} from '../locations-shared';
import {LocationCategory, LocationType} from '../locations.types';

/**
 * A location's fields, for the wizard and the details tab: type, category, names, the address (a URL for web
 * locations), the project's extra fields and the switches. The page's buttons go inside.
 */
@Component({
  selector: 'app-location-fields',
  templateUrl: './location-fields.component.html',
  styleUrl: './location-fields.component.scss',
  imports: [
    ReactiveFormsModule,
    CardComponent,
    FormFieldComponent,
    LabelComponent,
    ErrorComponent,
    InputDirective,
    SelectComponent,
    OptionComponent,
    SlideToggleComponent,
    AutoLanguagePipe,
    LocationsTranslationPipe,
  ],
  providers: [LocationsTranslationPipe],
})
export class LocationFieldsComponent {
  private readonly i18n = inject(LocationsTranslationPipe);

  readonly form = input.required<LocationForm>();
  readonly title = input.required<string>();
  readonly options = input.required<LocationsOptions>();
  readonly types = input<LocationType[]>([]);
  readonly categories = input<LocationCategory[]>([]);
  readonly countries = input<CountryOption[]>([]);
  /** A web location has a URL instead of an address */
  readonly web = input(false);
  /** The details tab can archive the location, unless the backend says it must stay active */
  readonly archivable = input(false);
  /** The name and description in another language, while this one has none */
  readonly namePlaceholder = input('');
  readonly descriptionPlaceholder = input('');

  readonly submitted = output<void>();

  protected readonly hasEmail = computed(() => !!this.options().fields?.includes('email'));
  protected readonly hasAccessibility = computed(() => !!this.options().fields?.includes('accessibility'));
  protected readonly hasCoordinates = computed(() => !!this.options().fields?.includes('coordinates'));
  protected readonly shortNameMaxLength = computed(() => this.options().shortNameMaxLength ?? null);
  /** The project's hint is a translation key or its own text */
  protected readonly emailHint = computed(() => {
    const hint = this.options().emailHint;
    if (!hint) return '';
    const translated = this.i18n.transform(hint);
    return typeof translated === 'string' && !translated.startsWith('@') ? translated : hint;
  });
}
