import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {ButtonComponent} from '../../../../../ui-components';
import {PromiseButtonDirective} from '../../../../shared/directives/PromiseButton';
import {AutoLanguagePipe} from '../../../../shared/pipes/auto-language.pipe';
import {ConfigurationService} from '../../../../shared/services/configuration.service';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {GeocodingService} from '../../geocoding.service';
import {LocationsTranslationPipe} from '../../i18n/locations.translation';
import {LocationFieldsComponent} from '../../location-fields/location-fields.component';
import {createLocationForm, resolveCoordinates, toLocationUpdate, trackLocationType} from '../../location-form';
import {CountryOption, countryId, injectLocationsOptions, loadCountries, loadLocationCategories, loadLocationTypes} from '../../locations-shared';
import {LocationsService} from '../../locations.service';
import {StoredLocation, LocationCategory, LocationType} from '../../locations.types';

/**
 * A location's fields in the user's language; the name and description in another language show as placeholders
 * until this one has its own
 */
@Component({
  selector: 'app-details-location',
  templateUrl: './details-location.component.html',
  imports: [LocationFieldsComponent, ButtonComponent, PromiseButtonDirective, LocationsTranslationPipe],
  providers: [LocationsTranslationPipe],
})
export class DetailsLocationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly locations = inject(LocationsService);
  private readonly configuration = inject(ConfigurationService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly geocoding = inject(GeocodingService);
  private readonly i18n = inject(LocationsTranslationPipe);
  private readonly autoLanguage = new AutoLanguagePipe(this.juicebox);
  private readonly language = this.juicebox.getLanguage();
  protected readonly options = injectLocationsOptions();

  /** Also read by the unsaved changes guard */
  protected readonly form = createLocationForm(this.options);
  private readonly type = trackLocationType(this.form);
  protected readonly web = computed(() => this.type() === 'web');
  protected readonly location = signal<StoredLocation | null>(null);
  protected readonly types = signal<LocationType[]>([]);
  protected readonly categories = signal<LocationCategory[]>([]);
  protected readonly countries = signal<CountryOption[]>([]);
  protected readonly namePlaceholder = signal('');
  protected readonly descriptionPlaceholder = signal('');
  protected readonly savePromise = signal<Promise<void>>(Promise.resolve());
  private readonly isAdmin = !!this.juicebox.hasPermission('locations:role#admin');
  /** As in the old form: a region can only be saved by an admin */
  protected readonly saveLocked = computed(() => this.type() === 'region' && !this.isAdmin);

  async ngOnInit(): Promise<void> {
    const id = this.route.parent?.snapshot.paramMap.get('id');
    if (!id) return;
    const [types, categories, countries, result] = await Promise.all([
      loadLocationTypes(this.configuration, this.juicebox),
      loadLocationCategories(this.configuration),
      loadCountries(this.locations, this.language),
      this.locations.get(id),
    ]);
    this.types.set(types);
    this.categories.set(categories);
    this.countries.set(countries);
    if (result?.success && result.payload) this.fill(result.payload);
  }

  protected save(): void {
    this.savePromise.set(this.update());
  }

  private fill(location: StoredLocation): void {
    this.location.set(location);
    const name = location.name?.[this.language] ?? null;
    const description = location.description?.[this.language] ?? null;
    this.namePlaceholder.set(name ? '' : this.autoLanguage.transform(location.name ?? ''));
    this.descriptionPlaceholder.set(description ? '' : this.autoLanguage.transform(location.description ?? ''));
    const address = location.address?.[0] ?? {};
    const country = address.country;
    const coordinates = location.attributes?.coordinates;
    this.form.reset({
      type: location.type ?? null,
      location_category: location.location_category ?? null,
      name,
      short_name: location.short_name ?? null,
      description,
      address: {
        street: address.street ?? null,
        postcode: address.postcode ?? null,
        city: address.city ?? null,
        country: countryId(country),
      },
      url: location.url ?? null,
      email: location.attributes?.email ?? null,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
      archived: !!location.archived,
      organisation_visibility: !!location.organisation_visibility,
      accessibility: !!location.accessibility,
    });
  }

  private async update(): Promise<void> {
    const location = this.location();
    this.form.markAllAsTouched();
    if (!location || this.form.invalid) return;

    const value = this.form.getRawValue();
    const outcome = await resolveCoordinates(value, this.options, this.countries(), this.geocoding);
    if ('error' in outcome) {
      this.juicebox.showToast('error', this.i18n.transform(outcome.error));
      return;
    }

    const result = await this.locations.put(location._id, toLocationUpdate(value, location, this.options, outcome.coordinates))
      .catch(() => null);
    if (!result?.success) {
      this.juicebox.showToast('error', this.i18n.transform('location_update_failed'));
      return;
    }
    // The stored location, so a next save keeps what this one stored (e.g. new coordinates)
    if (result.payload?.location) this.location.set(result.payload.location);
    this.form.markAsPristine();
    this.juicebox.showToast('success', this.i18n.transform('location_updated'));
  }
}
