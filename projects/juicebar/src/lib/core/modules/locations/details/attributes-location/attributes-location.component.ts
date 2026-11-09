import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import {
  ButtonComponent,
  CardComponent,
  FormFieldComponent,
  IconComponent,
  InputDirective,
  LabelComponent,
  SlideToggleComponent,
} from '../../../../../ui-components';
import {HasPermissionDirective} from '../../../../shared/directives/HasPermissionDirective';
import {PromiseButtonDirective} from '../../../../shared/directives/PromiseButton';
import {ConfigurationService} from '../../../../shared/services/configuration.service';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {LocationsTranslationPipe} from '../../i18n/locations.translation';
import {LocationsService} from '../../locations.service';
import {StoredLocation, LocationAttributeField} from '../../locations.types';

/** The attribute fields each location type has, from the `juicecommerce:location:attribute` configurations */
const TYPE_ATTRIBUTES: Record<string, string> = {stadion: 'location:stadion', hall: 'location:hall'};

/** The availability calendar's patterns, by their stored number (0 is none) */
const HATCHING_PATTERNS = [
  'horizontal_1', 'vertical_1', 'horizontal_2', 'vertical_2', 'diagonal_1', 'diagonal_2',
  'rectangles', 'rhombus', 'zigzag', 'dots', 'triangles_1', 'triangles_2',
].map((name, index) => ({value: index + 1, name}));

/** A stadium's or hall's attribute fields, and the hatching pattern the availability calendar shows the location with */
@Component({
  selector: 'app-attributes-location',
  templateUrl: './attributes-location.component.html',
  styleUrl: './attributes-location.component.scss',
  imports: [
    ReactiveFormsModule,
    CardComponent,
    FormFieldComponent,
    LabelComponent,
    InputDirective,
    SlideToggleComponent,
    ButtonComponent,
    IconComponent,
    HasPermissionDirective,
    PromiseButtonDirective,
    LocationsTranslationPipe,
  ],
  providers: [LocationsTranslationPipe],
})
export class AttributesLocationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly locations = inject(LocationsService);
  private readonly configuration = inject(ConfigurationService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly i18n = inject(LocationsTranslationPipe);

  protected readonly patterns = HATCHING_PATTERNS;
  private readonly hatching = new FormControl(0, {nonNullable: true});
  /** Also read by the unsaved changes guard */
  protected readonly form = new FormGroup<Record<string, FormControl>>({hatching_pattern: this.hatching});
  protected readonly pattern = toSignal(this.hatching.valueChanges, {initialValue: 0});
  /** The dictionary key of the pattern shown */
  protected readonly patternLabel = computed(() => {
    const shown = HATCHING_PATTERNS.find(option => option.value === this.pattern());
    return shown ? `pattern_${shown.name}` : 'no_hatching_pattern';
  });
  protected readonly fields = signal<LocationAttributeField[]>([]);
  protected readonly location = signal<StoredLocation | null>(null);
  protected readonly pickerOpen = signal(false);
  protected readonly savePromise = signal<Promise<void>>(Promise.resolve());

  async ngOnInit(): Promise<void> {
    const id = this.route.parent?.snapshot.paramMap.get('id');
    if (!id) return;
    const result = await this.locations.get(id);
    if (!result?.success || !result.payload) return;
    const location = result.payload;
    const attributes = location.attributes ?? {};

    const model = TYPE_ATTRIBUTES[location.type ?? ''];
    if (model) {
      const configured = await this.configuration.getBySchema('juicecommerce:location:attribute');
      const fields: LocationAttributeField[] = (configured?.payload ?? []).filter((field: LocationAttributeField) => field.model === model);
      for (const field of fields) {
        this.form.addControl(field.property, new FormControl(attributes[field.property] ?? null,
          field.required ? Validators.required : null));
      }
      this.fields.set(fields);
    }
    this.hatching.setValue(attributes.hatching_pattern ?? 0);
    this.form.markAsPristine();
    this.location.set(location);
  }

  /** "No hatching pattern" on sets none; off starts from the first pattern, as Reset does */
  protected setNoPattern(none: boolean): void {
    this.setPattern(none ? 0 : 1);
  }

  protected pick(value: number): void {
    this.setPattern(value);
    this.pickerOpen.set(false);
  }

  protected reset(): void {
    this.setPattern(1);
  }

  protected save(): void {
    this.savePromise.set(this.update());
  }

  private setPattern(value: number): void {
    this.hatching.setValue(value);
    this.hatching.markAsDirty();
  }

  private async update(): Promise<void> {
    const location = this.location();
    this.form.markAllAsTouched();
    if (!location || this.form.invalid) return;
    // As the old tab: the location's attributes with this tab's values
    const attributes = {...location.attributes, ...this.form.getRawValue()};
    const result = await this.locations.updateAttributes(location._id, attributes);
    if (!result?.success) {
      this.juicebox.showToast('error', this.i18n.transform('saving_failed'));
      return;
    }
    this.location.set({...location, attributes});
    this.form.markAsPristine();
    this.juicebox.showToast('success', this.i18n.transform('attributes_updated'));
  }
}
