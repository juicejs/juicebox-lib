import {Signal, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {LocationsOptions} from '../../../config/base-app.config';
import {GeocodingService} from './geocoding.service';
import {CountryOption, countryId} from './locations-shared';
import {StoredLocation, LocationAttributes, LocationCoordinates, LocationCreate, LocationUpdate} from './locations.types';

/** The fields of the wizard and of the details tab */
export function createLocationForm(options: LocationsOptions) {
  const maxLength = options.shortNameMaxLength;
  return new FormGroup({
    type: new FormControl<string | null>(null, Validators.required),
    location_category: new FormControl<string | null>(null),
    name: new FormControl<string | null>(null, Validators.required),
    short_name: new FormControl<string | null>(null, maxLength ? Validators.maxLength(maxLength) : null),
    description: new FormControl<string | null>(null),
    address: new FormGroup({
      street: new FormControl<string | null>(null, Validators.required),
      postcode: new FormControl<string | null>(null, Validators.required),
      city: new FormControl<string | null>(null, Validators.required),
      country: new FormControl<string | null>(null, Validators.required),
    }),
    url: new FormControl<string | null>(null),
    email: new FormControl<string | null>(null),
    latitude: new FormControl<number | null>(null),
    longitude: new FormControl<number | null>(null),
    archived: new FormControl(false, {nonNullable: true}),
    organisation_visibility: new FormControl(false, {nonNullable: true}),
    accessibility: new FormControl(false, {nonNullable: true}),
  });
}

export type LocationForm = ReturnType<typeof createLocationForm>;
export type LocationFormValue = ReturnType<LocationForm['getRawValue']>;

/**
 * The type picked in the form. A web location has a URL instead of an address, description and coordinates: its
 * address is not required and none of them is sent. Call in an injection context.
 */
export function trackLocationType(form: LocationForm): Signal<string | null> {
  const type = signal(form.controls.type.value);
  const apply = (value: string | null) => {
    const web = value === 'web';
    for (const control of Object.values(form.controls.address.controls)) {
      control.setValidators(web ? null : Validators.required);
      control.updateValueAndValidity({emitEvent: false});
    }
    form.updateValueAndValidity({emitEvent: false});
    type.set(value);
  };
  form.controls.type.valueChanges.pipe(takeUntilDestroyed()).subscribe(apply);
  apply(form.controls.type.value);
  return type.asReadonly();
}

export type CoordinatesOutcome =
  | {coordinates: LocationCoordinates | null}
  | {error: 'coordinates_pair_required' | 'coordinates_invalid'};

/**
 * The location's coordinates: the ones typed in, when the project has the field, or else the address search's. Null
 * when neither gives any (a stored location then keeps its own).
 */
export async function resolveCoordinates(
  value: LocationFormValue,
  options: LocationsOptions,
  countries: CountryOption[],
  geocoding: GeocodingService,
): Promise<CoordinatesOutcome> {
  if (value.type === 'web') return {coordinates: null};
  if (options.fields?.includes('coordinates')) {
    const hasLatitude = value.latitude !== null;
    const hasLongitude = value.longitude !== null;
    if (hasLatitude !== hasLongitude) return {error: 'coordinates_pair_required'};
    if (hasLatitude) {
      const latitude = Number(value.latitude);
      const longitude = Number(value.longitude);
      const valid = Number.isFinite(latitude) && Number.isFinite(longitude)
        && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
      return valid ? {coordinates: {latitude, longitude}} : {error: 'coordinates_invalid'};
    }
  }
  const {street, city, country} = value.address;
  const countryName = countries.find(option => option._id === country)?.englishName;
  if (!street || !city || !countryName) return {coordinates: null};
  return {coordinates: await geocoding.coordinatesOf(street, city, countryName)};
}

/** The new location, as the old wizard sent it to `createLocation` */
export function toLocationCreate(
  value: LocationFormValue,
  options: LocationsOptions,
  coordinates: LocationCoordinates | null,
): LocationCreate {
  const web = value.type === 'web';
  const attributes: LocationAttributes = {};
  if (coordinates) attributes.coordinates = coordinates;
  if (options.fields?.includes('email') && value.email) attributes.email = value.email;
  return {
    name: value.name,
    short_name: value.short_name,
    description: web ? null : value.description,
    street: web ? null : value.address.street,
    city: web ? null : value.address.city,
    postcode: web ? null : value.address.postcode,
    country: web ? null : value.address.country,
    type: value.type,
    location_category: value.location_category,
    url: web ? value.url : null,
    archived: false,
    organisation_visibility: value.organisation_visibility,
    ...(options.fields?.includes('accessibility') && {accessibility: value.accessibility}),
    attributes,
  };
}

/**
 * The location's changes, as the old details form sent them to `updateLocation`. The service replaces the attributes,
 * so the stored ones are sent along (the old master form lost them).
 */
export function toLocationUpdate(
  value: LocationFormValue,
  stored: StoredLocation,
  options: LocationsOptions,
  coordinates: LocationCoordinates | null,
): LocationUpdate {
  const web = value.type === 'web';
  const attributes: LocationAttributes = {...stored.attributes};
  if (coordinates) attributes.coordinates = coordinates;
  if (options.fields?.includes('email')) {
    if (value.email) attributes.email = value.email;
    else delete attributes.email;
  }
  return {
    name: value.name,
    short_name: value.short_name,
    description: web ? null : value.description,
    address: web ? {street: null, city: null, postcode: null, country: null} : {...value.address},
    type: value.type,
    location_category: value.location_category,
    url: web ? value.url : null,
    archived: value.archived,
    organisation_visibility: value.organisation_visibility,
    ...(options.fields?.includes('accessibility') && {accessibility: value.accessibility}),
    attributes,
  };
}

/** A stored location sent back unchanged but for `archived`, for the listing's archive and unarchive */
export function storedLocationUpdate(location: StoredLocation, language: string, name: string, archived: boolean): LocationUpdate {
  const address = location.address?.[0] ?? {};
  const country = address.country;
  return {
    name,
    short_name: location.short_name ?? null,
    description: location.description?.[language] ?? null,
    address: {
      street: address.street ?? null,
      city: address.city ?? null,
      postcode: address.postcode ?? null,
      country: countryId(country),
    },
    type: location.type ?? null,
    location_category: location.location_category ?? null,
    url: location.url ?? null,
    archived,
    organisation_visibility: location.organisation_visibility,
    accessibility: location.accessibility,
    attributes: location.attributes ?? {},
  };
}
