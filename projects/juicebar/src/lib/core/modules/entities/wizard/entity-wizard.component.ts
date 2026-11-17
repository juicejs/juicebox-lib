import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {
  ButtonComponent,
  CardComponent,
  ErrorComponent,
  FormFieldComponent,
  InputDirective,
  LabelComponent,
  OptionComponent,
  SelectComponent,
  SlideToggleComponent,
} from '../../../../ui-components';
import {ListingStateService} from '../../../shared/components/listing-pane/listing-pane';
import {HasPermissionHideDirective} from '../../../shared/directives/HasPermissionHideDirective';
import {PromiseButtonDirective} from '../../../shared/directives/PromiseButton';
import {ConfigurationService} from '../../../shared/services/configuration.service';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {ENTITIES_URL, hasAmgShop, loadEntitySettings, translatedOr, translatedTypes} from '../entities-shared';
import {EntitiesService} from '../entities.service';
import {EntityType} from '../entities.types';
import {choiceValue, EMAIL_PATTERN, languageOptions, newEntityData} from '../entity-form';
import {EntitiesTranslationPipe} from '../i18n/entities.translation';

/**
 * Creates a customer, or an organisation on its own shorter form, for the organisation the staff member is signed
 * in to, and returns to the listing. The type starts as the listing's; the old page's payload is kept (entity-form).
 */
@Component({
  selector: 'app-entity-wizard',
  templateUrl: './entity-wizard.component.html',
  styleUrl: '../entity-form.scss',
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
    ButtonComponent,
    HasPermissionHideDirective,
    PromiseButtonDirective,
    EntitiesTranslationPipe,
  ],
  providers: [EntitiesTranslationPipe],
})
export class EntityWizardComponent implements OnInit {
  private readonly entities = inject(EntitiesService);
  private readonly configuration = inject(ConfigurationService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly router = inject(Router);
  private readonly listingState = inject(ListingStateService);
  private readonly i18n = inject(EntitiesTranslationPipe);
  /**
   * What the page was opened with, as the old juicebox passed it: the listing's type and types, or from a user's
   * organisations tab the one type Organisation. A page opened by its address has none.
   */
  private readonly opened = this.router.currentNavigation()?.extras.state as
    {selectedType?: Pick<EntityType, 'prop'> | null; types?: EntityType[]} | undefined;

  /** Both forms are read by the unsaved changes guard */
  protected readonly entityForm = new FormGroup({
    salutation: new FormControl<string | null>(null),
    sex: new FormControl<string | null>(null),
    email: new FormControl('', [Validators.required, Validators.pattern(EMAIL_PATTERN)]),
    title: new FormControl(''),
    firstname: new FormControl('', Validators.required),
    lastname: new FormControl('', Validators.required),
    name: new FormControl(''),
    taxNumber: new FormControl(''),
    phone: new FormControl(''),
    mobilephone: new FormControl(''),
    type: new FormControl('', Validators.required),
    street: new FormControl(''),
    street2: new FormControl(''),
    postcode: new FormControl(''),
    city: new FormControl(''),
    country: new FormControl<string | null>(null),
    languages: new FormControl<string[]>([]),
    phoneCallingNumber: new FormControl(''),
    mobilephoneCallingNumber: new FormControl(''),
  });
  protected readonly organisationForm = new FormGroup({
    name: new FormControl('', Validators.required),
    taxNumber: new FormControl(''),
    phone: new FormControl(''),
    mobilephone: new FormControl(''),
    type: new FormControl('', Validators.required),
    street: new FormControl(''),
    street2: new FormControl(''),
    postcode: new FormControl(''),
    city: new FormControl(''),
    country: new FormControl<string | null>(null),
  });

  protected readonly types = signal<EntityType[]>([]);
  protected readonly selectedType = signal<string | null>(null);
  /** The organisation form is shown for the type Organisation, the customer form for every other type */
  protected readonly organisation = computed(() => this.selectedType() === 'organisation');
  protected readonly isProtected = signal(false);
  protected readonly amgShop = signal(false);
  protected readonly createPromise = signal<Promise<void> | null>(null);
  protected readonly countries = this.juicebox.getCountriesByLanguage(this.juicebox.getLanguage());
  // Stored in English whatever the admin's language
  protected readonly salutations = [
    {key: 'Mr', name: this.i18n.transform('mr')},
    {key: 'Mrs', name: this.i18n.transform('mrs')},
  ];
  protected readonly genders = [
    {key: 'Male', name: this.i18n.transform('male')},
    {key: 'Female', name: this.i18n.transform('female')},
  ];
  private readonly languageSearch = signal('');
  private readonly chosenLanguages = signal<string[]>([]);
  protected readonly languages = computed(() => languageOptions(this.i18n, this.chosenLanguages(), this.languageSearch()));

  async ngOnInit(): Promise<void> {
    this.juicebox.navigationEvent({
      location: this.i18n.transform('customers'),
      subject: this.i18n.transform('create_customer'),
      link: ENTITIES_URL,
    });

    const [settings, amgShop] = await Promise.all([loadEntitySettings(this.configuration), hasAmgShop(this.configuration)]);
    this.amgShop.set(amgShop);
    // The types it was opened with, or else the configuration's
    const types = this.opened?.types?.length
      ? this.opened.types.map(type => ({...type, name: translatedOr(this.i18n, type.name)}))
      : translatedTypes(settings, this.i18n);
    this.types.set(types);
    const openedType = this.opened?.selectedType;
    const type = (openedType && types.find(option => (option.prop ?? '') === (openedType.prop ?? ''))) || types[0];
    if (type) this.setType(type.prop);
    if (settings.default_protected_value !== null && settings.default_protected_value !== undefined) {
      this.isProtected.set(settings.default_protected_value);
    }
  }

  protected selectType(prop: string): void {
    if (this.types().some(type => type.prop === prop)) this.setType(prop);
  }

  protected searchLanguages(term: string): void {
    this.languageSearch.set(term);
  }

  protected languagesChanged(languages: string[] | null): void {
    this.chosenLanguages.set(languages ?? []);
  }

  protected submit(): void {
    this.createPromise.set(this.save());
  }

  /** The type in both forms, so the one shown has it */
  private setType(prop: string): void {
    this.selectedType.set(prop);
    this.entityForm.controls.type.setValue(prop);
    this.organisationForm.controls.type.setValue(prop);
  }

  private async save(): Promise<void> {
    const form: FormGroup = this.organisation() ? this.organisationForm : this.entityForm;
    form.markAllAsTouched();
    if (form.invalid) return;

    const value: Record<string, unknown> = {...form.getRawValue()};
    // A choice never made goes out as the old form sent it
    for (const choice of ['salutation', 'sex', 'country']) {
      const control = form.get(choice);
      if (control) value[choice] = choiceValue(control);
    }
    const result = await this.entities.create(newEntityData(value, this.isProtected()));
    if (!result?.success) {
      this.juicebox.showToast('error', this.i18n.transform(result?.error), this.i18n.transform('error'));
      return;
    }
    this.juicebox.showToast('success', this.i18n.transform('successfully created entity'), this.i18n.transform('success'));
    this.entityForm.markAsPristine();
    this.organisationForm.markAsPristine();
    // The listing starts afresh, on its first page
    this.listingState.forget('entities');
    await this.router.navigateByUrl(ENTITIES_URL);
  }
}
