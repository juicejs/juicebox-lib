import {Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {Router} from '@angular/router';
import {ButtonComponent} from '../../../../ui-components';
import {HasPermissionDirective} from '../../../shared/directives/HasPermissionDirective';
import {PromiseButtonDirective} from '../../../shared/directives/PromiseButton';
import {ConfigurationService} from '../../../shared/services/configuration.service';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {GeocodingService} from '../geocoding.service';
import {LocationsTranslationPipe} from '../i18n/locations.translation';
import {LocationFieldsComponent} from '../location-fields/location-fields.component';
import {createLocationForm, resolveCoordinates, toLocationCreate, trackLocationType} from '../location-form';
import {CountryOption, injectLocationsOptions, loadCountries, loadLocationCategories, loadLocationTypes} from '../locations-shared';
import {LocationsService} from '../locations.service';
import {LocationCategory, LocationType} from '../locations.types';

/** Creates a location in the user's language and opens it */
@Component({
  selector: 'app-location-wizard',
  templateUrl: './location-wizard.component.html',
  imports: [LocationFieldsComponent, ButtonComponent, HasPermissionDirective, PromiseButtonDirective, LocationsTranslationPipe],
  providers: [LocationsTranslationPipe],
})
export class LocationWizardComponent implements OnInit, OnDestroy {
  private readonly locations = inject(LocationsService);
  private readonly configuration = inject(ConfigurationService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly geocoding = inject(GeocodingService);
  private readonly router = inject(Router);
  private readonly i18n = inject(LocationsTranslationPipe);
  protected readonly options = injectLocationsOptions();

  /** Also read by the unsaved changes guard */
  protected readonly form = createLocationForm(this.options);
  private readonly type = trackLocationType(this.form);
  protected readonly web = computed(() => this.type() === 'web');
  protected readonly types = signal<LocationType[]>([]);
  protected readonly categories = signal<LocationCategory[]>([]);
  protected readonly countries = signal<CountryOption[]>([]);
  protected readonly createPromise = signal<Promise<void>>(Promise.resolve());

  async ngOnInit(): Promise<void> {
    this.juicebox.navigationEvent({
      location: this.i18n.transform('location'),
      subject: this.i18n.transform('create_location'),
      link: 'main/location',
    });
    this.juicebox.setPageHeader({scope: '/main/location/location-wizard', title: this.i18n.transform('create_location')});

    const [types, categories, countries] = await Promise.all([
      loadLocationTypes(this.configuration, this.juicebox),
      loadLocationCategories(this.configuration),
      loadCountries(this.locations, this.juicebox.getLanguage()),
    ]);
    this.types.set(types);
    this.categories.set(categories);
    this.countries.set(countries);

    // The user's own country, as the old wizard picked it
    const country = countries.find(option => option.code === this.juicebox.getUserLanguage(true));
    const countryControl = this.form.controls.address.controls.country;
    if (country && !countryControl.value) countryControl.setValue(country._id);
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

    const value = this.form.getRawValue();
    const outcome = await resolveCoordinates(value, this.options, this.countries(), this.geocoding);
    if ('error' in outcome) {
      this.juicebox.showToast('error', this.i18n.transform(outcome.error));
      return;
    }

    const result = await this.locations.create(toLocationCreate(value, this.options, outcome.coordinates)).catch(() => null);
    const location = result?.success ? result.payload?.location : null;
    if (!location) {
      this.juicebox.showToast('error', this.i18n.transform('location_creating_failed'));
      return;
    }
    this.form.markAsPristine();
    this.juicebox.showToast('success', this.i18n.transform('location_created'));
    await this.router.navigate(['/main/location/details', location._id, 'details-location']);
  }
}
