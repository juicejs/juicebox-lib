import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import {
  ButtonComponent,
  CardComponent,
  ErrorComponent,
  FormFieldComponent,
  InputDirective,
  LabelComponent,
  OptionComponent,
  SelectComponent,
} from '../../../../../ui-components';
import {HasPermissionDirective} from '../../../../shared/directives/HasPermissionDirective';
import {PromiseButtonDirective} from '../../../../shared/directives/PromiseButton';
import {ConfigurationService} from '../../../../shared/services/configuration.service';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {hasAmgShop, loadEntitySettings, translatedTypes} from '../../entities-shared';
import {EntitiesService} from '../../entities.service';
import {Entity, EntityGroup, EntityType} from '../../entities.types';
import {allowPhoneKey, choiceValue, EMAIL_PATTERN, languageOptions} from '../../entity-form';
import {EntitiesTranslationPipe} from '../../i18n/entities.translation';
import {AttributeListComponent} from '../attributes-entity/attribute-list/attribute-list.component';

/** The groups offered in the Group field at a time */
const GROUPS_SHOWN = 10;

/**
 * The Details tab: a customer's names, contact details, groups, country and languages. The type and the organisation
 * name are shown and not changed here. As in the old tab, Save does not wait for the required fields (an organisation
 * has no first and last name), and a changed country is stored on the customer's first address.
 */
@Component({
  selector: 'app-details-entity',
  templateUrl: './details-entity.component.html',
  styleUrl: '../../entity-form.scss',
  imports: [
    ReactiveFormsModule,
    CardComponent,
    FormFieldComponent,
    LabelComponent,
    ErrorComponent,
    InputDirective,
    SelectComponent,
    OptionComponent,
    ButtonComponent,
    HasPermissionDirective,
    PromiseButtonDirective,
    AttributeListComponent,
    EntitiesTranslationPipe,
  ],
  providers: [EntitiesTranslationPipe],
})
export class DetailsEntityComponent implements OnInit {
  private readonly entities = inject(EntitiesService);
  private readonly configuration = inject(ConfigurationService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly route = inject(ActivatedRoute);
  private readonly i18n = inject(EntitiesTranslationPipe);
  private readonly entityId: string = this.route.snapshot.parent?.params['id'];

  /** Also read by the unsaved changes guard */
  protected readonly entityForm = new FormGroup({
    salutation: new FormControl<string | null>(null),
    email: new FormControl<string | null>(null, [Validators.required, Validators.pattern(EMAIL_PATTERN)]),
    title: new FormControl<string | null>(null),
    sex: new FormControl<string | null>(null),
    firstname: new FormControl<string | null>(null, Validators.required),
    lastname: new FormControl<string | null>(null, Validators.required),
    name: new FormControl<string | null>(null),
    taxNumber: new FormControl<string | null>(null),
    phone: new FormControl<string | null>(null),
    mobilephone: new FormControl<string | null>(null),
    groups: new FormControl<string[] | null>(null),
    country: new FormControl<string | null>(null),
    languages: new FormControl<string[] | null>(null),
    phoneCallingNumber: new FormControl(''),
    mobilephoneCallingNumber: new FormControl(''),
  });

  private readonly entity = signal<Entity | null>(null);
  protected readonly loaded = computed(() => !!this.entity());
  protected readonly types = signal<EntityType[]>([]);
  /** The customer's own type; it is shown, sent back as it is and not changed here */
  protected readonly type = computed(() => this.types().find(type => type.prop === this.entity()?.type)?.prop ?? '');
  protected readonly amgShop = signal(false);
  /** Shows the attribute values under the form (`additionalAttributes` of the settings) */
  protected readonly additionalAttributes = signal(false);
  protected readonly updatePromise = signal<Promise<void> | null>(null);
  protected readonly countries = this.juicebox.getCountriesByLanguage(this.juicebox.getLanguage());
  // Stored in English whatever the admin's language
  protected readonly salutations = [
    {key: 'Mr', name: this.i18n.transform('mr')},
    {key: 'Mrs', name: this.i18n.transform('mrs')},
    {key: 'Diverse', name: this.i18n.transform('diverse')},
  ];
  protected readonly genders = [
    {key: 'Male', name: this.i18n.transform('male')},
    {key: 'Female', name: this.i18n.transform('female')},
    {key: 'Diverse', name: this.i18n.transform('diverse')},
  ];
  protected readonly allowPhoneKey = allowPhoneKey;

  /** The groups read last, and every group read so far: a chosen group keeps its name when the others change */
  private readonly offeredGroups = signal<EntityGroup[]>([]);
  private readonly knownGroups = signal<ReadonlyMap<string, EntityGroup>>(new Map());
  private readonly chosenGroups = signal<string[]>([]);
  protected readonly groups = computed<EntityGroup[]>(() => {
    const offered = this.offeredGroups();
    const known = this.knownGroups();
    const chosen = this.chosenGroups()
      .filter(id => !offered.some(group => group._id === id))
      .map(id => known.get(id))
      .filter((group): group is EntityGroup => !!group);
    return [...offered, ...chosen];
  });
  private groupRequest = 0;

  private readonly languageSearch = signal('');
  private readonly chosenLanguages = signal<string[]>([]);
  protected readonly languages = computed(() => languageOptions(this.i18n, this.chosenLanguages(), this.languageSearch()));

  async ngOnInit(): Promise<void> {
    const result = await this.entities.get(this.entityId);
    if (!result?.success || !result.payload) return;
    const entity = result.payload;

    const [settings, amgShop] = await Promise.all([loadEntitySettings(this.configuration), hasAmgShop(this.configuration)]);
    this.amgShop.set(amgShop);
    this.additionalAttributes.set(!!settings.additionalAttributes);
    this.types.set(translatedTypes(settings, this.i18n));
    // The customer's own groups, all of them: each is shown in the field and can be taken out
    await this.readGroups({id_filter: entity.groups, id_exclude: false}, Math.max(GROUPS_SHOWN, entity.groups?.length ?? 0));

    const country = this.countries.find(option => option.code === entity.addresses?.[0]?.country);
    this.chosenGroups.set((entity.groups ?? []).map(String));
    this.chosenLanguages.set(entity.languages ?? []);
    this.entityForm.reset({
      salutation: entity.salutation ?? null,
      email: entity.email ?? null,
      title: entity.title ?? null,
      sex: entity.sex ?? null,
      firstname: entity.firstname ?? null,
      lastname: entity.lastname ?? null,
      name: entity.name ?? null,
      taxNumber: entity.taxNumber ?? null,
      phone: entity.phone ?? null,
      mobilephone: entity.mobilephone ?? null,
      groups: entity.groups ?? null,
      country: country?.code ?? null,
      languages: entity.languages ?? null,
      phoneCallingNumber: stringOr(entity.attributes?.['phoneCallingNumber']),
      mobilephoneCallingNumber: stringOr(entity.attributes?.['mobilephoneCallingNumber']),
    });
    this.entity.set(entity);
  }

  protected update(): void {
    this.updatePromise.set(this.save());
  }

  /** Opened: the organisation's first groups */
  protected groupsOpened(): void {
    void this.readGroups({});
  }

  /** Typed: the groups whose name contains the text */
  protected searchGroups(term: string): void {
    void this.readGroups(term ? {filter: [{property: 'name', term, fullText: true}]} : {});
  }

  protected groupsChanged(groups: string[] | null): void {
    this.chosenGroups.set(groups ?? []);
  }

  protected searchLanguages(term: string): void {
    this.languageSearch.set(term);
  }

  protected languagesChanged(languages: string[] | null): void {
    this.chosenLanguages.set(languages ?? []);
  }

  private async readGroups(options: Parameters<EntitiesService['fetchEntityGroups']>[2], pageSize = GROUPS_SHOWN): Promise<void> {
    const request = ++this.groupRequest;
    const result = await this.entities.fetchEntityGroups(0, pageSize, options);
    if (request !== this.groupRequest) return;
    const groups = result?.payload?.items ?? [];
    this.knownGroups.update(known => new Map([...known, ...groups.map(group => [group._id, group] as const)]));
    this.offeredGroups.set(groups);
  }

  private async save(): Promise<void> {
    const entity = this.entity();
    if (!entity) return;
    const controls = this.entityForm.controls;
    const value = this.entityForm.getRawValue();
    const result = await this.entities.put(entity._id, {...value, type: this.type(), country: choiceValue(controls.country)});
    if (!result?.success) {
      this.juicebox.showToast('error', this.i18n.transform(result?.error), this.i18n.transform('error'));
      return;
    }

    // A changed country is the first address's
    const address = entity.addresses?.[0];
    if (address && controls.country.dirty && (value.country ?? null) !== (address.country ?? null)) {
      const addressResult = await this.entities.updateAddress(entity._id, {...address, country: value.country});
      if (!addressResult?.success) {
        this.juicebox.showToast('error', this.i18n.transform(addressResult?.error), this.i18n.transform('error'));
        return;
      }
      this.entity.set({...entity, addresses: [{...address, country: value.country ?? undefined}, ...(entity.addresses ?? []).slice(1)]});
    }

    this.juicebox.showToast('success', this.i18n.transform('customer_successfully_updated'), this.i18n.transform('success'));
    this.entityForm.markAsPristine();
  }
}

function stringOr(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}
