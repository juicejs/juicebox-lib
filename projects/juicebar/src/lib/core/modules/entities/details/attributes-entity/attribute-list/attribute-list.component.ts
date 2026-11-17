import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import {
  ButtonComponent,
  CardComponent,
  DatepickerComponent,
  DateStruct,
  FormFieldComponent,
  InputDirective,
  LabelComponent,
  OptionComponent,
  SelectComponent,
  SlideToggleComponent,
} from '../../../../../../ui-components';
import {PromiseButtonDirective} from '../../../../../shared/directives/PromiseButton';
import {ConfigurationService} from '../../../../../shared/services/configuration.service';
import {JuiceboxService} from '../../../../../shared/services/Juicebox.service';
import {attributeName, loadEntityAttributes} from '../../../entities-shared';
import {EntitiesService} from '../../../entities.service';
import {Entity, EntityAttribute} from '../../../entities.types';
import {EntitiesTranslationPipe} from '../../../i18n/entities.translation';

interface AttributeField {
  attribute: EntityAttribute;
  property: string;
  name: string;
  /** The marketing switch of shop customers says what it is for */
  explained: boolean;
}

/** The marketing switch's configuration key */
const MARKETING_KEY = 'marketing-communication:entity:shop';

/**
 * A customer's values for the attribute fields of its type (`juicecommerce:entity:attribute`): a text, a number, a
 * date, a choice or a switch each. Save sends the values that were changed, a date as noon of its day, and a value
 * kept per language with the other languages' texts. Shown on the Attributes tab and, where the settings say so,
 * under the Details tab's form.
 */
@Component({
  selector: 'app-entity-attribute-list',
  templateUrl: './attribute-list.component.html',
  styleUrl: './attribute-list.component.scss',
  imports: [
    ReactiveFormsModule,
    CardComponent,
    FormFieldComponent,
    LabelComponent,
    InputDirective,
    SelectComponent,
    OptionComponent,
    SlideToggleComponent,
    DatepickerComponent,
    ButtonComponent,
    PromiseButtonDirective,
    EntitiesTranslationPipe,
  ],
  providers: [EntitiesTranslationPipe],
})
export class AttributeListComponent implements OnInit {
  private readonly entities = inject(EntitiesService);
  private readonly configuration = inject(ConfigurationService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly i18n = inject(EntitiesTranslationPipe);
  private readonly entityId: string = inject(ActivatedRoute).snapshot.parent?.params['id'];
  private readonly language = this.juicebox.getLanguage();

  private readonly entity = signal<Entity | null>(null);
  /** The customer's type, for the dialog that deletes one of the type's fields */
  readonly entityType = computed(() => this.entity()?.type ?? null);
  protected readonly fields = signal<AttributeField[]>([]);
  protected readonly form = signal<FormGroup<Record<string, FormControl<unknown>>> | null>(null);
  protected readonly savePromise = signal<Promise<void> | null>(null);
  protected readonly minDate = new Date(1920, 0, 1);
  protected readonly maxDate = new Date();
  /** What the form started with, or was saved with last: only what differs is sent */
  private initial: Record<string, unknown> = {};

  ngOnInit(): Promise<void> {
    return this.reload();
  }

  /** Reads the customer and the attribute fields again, e.g. after a field was added or deleted */
  async reload(): Promise<void> {
    const [result, attributes] = await Promise.all([this.entities.get(this.entityId), loadEntityAttributes(this.configuration)]);
    if (!result?.success || !result.payload) return;
    const entity = result.payload;
    const stored = entity.attributes ?? {};
    // A customer without a type gets the fields of every type
    const model = entity.type ? `entity:${entity.type}` : null;
    const shown = attributes.filter(attribute => !model || attribute.model === model);

    const controls: Record<string, FormControl<unknown>> = {};
    for (const attribute of shown) {
      const value = stored[attribute.property];
      const required = attribute.internationalization || attribute.required ? [Validators.required] : [];
      controls[attribute.property] = new FormControl<unknown>(this.shownValue(attribute, value), required);
    }
    const form = new FormGroup(controls);
    this.initial = form.getRawValue();
    this.entity.set(entity);
    this.fields.set(shown.map(attribute => ({
      attribute,
      property: attribute.property,
      name: attributeName(attribute, this.i18n, this.language),
      explained: attribute.key === MARKETING_KEY,
    })));
    this.form.set(form);
  }

  protected submit(): void {
    this.savePromise.set(this.save());
  }

  private async save(): Promise<void> {
    const entity = this.entity();
    const form = this.form();
    if (!entity || !form) return;
    const value = form.getRawValue();
    const stored = entity.attributes ?? {};
    const data: Record<string, unknown> = {};
    for (const {attribute, property} of this.fields()) {
      const current = value[property];
      if (attribute.internationalization) {
        // The other languages' texts stay
        const texts = stored[property];
        data[property] = {...(isRecord(texts) ? texts : {}), [this.language]: current};
      } else if (!sameValue(current, this.initial[property])) {
        data[property] = attribute.datatype === 'date' && isDateStruct(current)
          ? new Date(current.year, current.month - 1, current.day, 12, 0)
          : current;
      }
    }

    const result = await this.entities.updateAttributes(entity._id, data);
    if (!result?.success) {
      this.juicebox.showToast('error', this.i18n.transform(result?.error), this.i18n.transform('error'));
      return;
    }
    this.juicebox.showToast('success', this.i18n.transform('attributes_updated'), this.i18n.transform('success'));
    this.initial = value;
    this.entity.set({...entity, attributes: {...stored, ...data}});
    form.markAsPristine();
  }

  /** A stored value as its field shows it: a date as year, month and day, a text per language in the admin's language */
  private shownValue(attribute: EntityAttribute, value: unknown): unknown {
    if (attribute.internationalization) return isRecord(value) ? value[this.language] ?? '' : '';
    if (value === undefined) return '';
    if (attribute.datatype === 'date' && value) {
      const date = new Date(value as string);
      return Number.isNaN(date.getTime()) ? '' : {year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate()};
    }
    return value;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isDateStruct(value: unknown): value is DateStruct {
  return isRecord(value) && typeof value['year'] === 'number' && typeof value['month'] === 'number' && typeof value['day'] === 'number';
}

/** Whether a field still holds what it started with; a date by its day */
function sameValue(current: unknown, initial: unknown): boolean {
  if (isDateStruct(current) && isDateStruct(initial)) {
    return current.year === initial.year && current.month === initial.month && current.day === initial.day;
  }
  return current === initial;
}
