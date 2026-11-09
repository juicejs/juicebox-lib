import {inject} from '@angular/core';
import {LOCATIONS_CUSTOMIZATION, LocationsOptions} from '../../../config/base-app.config';
import {ConfigurationService} from '../../shared/services/configuration.service';
import {JuiceboxService} from '../../shared/services/Juicebox.service';
import {LocationsService} from './locations.service';
import {LocationAddress, LocationCategory, LocationCountry, LocationType} from './locations.types';

/** The project's locations options (provideLocations({ options })). Call in an injection context. */
export function injectLocationsOptions(): LocationsOptions {
  return inject(LOCATIONS_CUSTOMIZATION, {optional: true})?.options ?? {};
}

/** The `location:type` configurations the user may use: those without permissions, or with one the user has */
export async function loadLocationTypes(configuration: ConfigurationService, juicebox: JuiceboxService): Promise<LocationType[]> {
  const result = await configuration.getBySchema('location:type');
  const types: LocationType[] = result?.payload ?? [];
  return types.filter(type =>
    !type.permissions || type.permissions.some(permission => juicebox.hasPermission('locations:role#' + permission)));
}

export async function loadLocationCategories(configuration: ConfigurationService): Promise<LocationCategory[]> {
  const result = await configuration.getBySchema('location:category');
  return result?.payload ?? [];
}

/** A country to pick, named in the user's language; `englishName` is the one the address search is given */
export interface CountryOption {
  _id: string;
  code: string;
  name: string;
  englishName: string;
}

/** The countries of the locations service, named in `language` and in its alphabetical order */
export async function loadCountries(locations: LocationsService, language: string): Promise<CountryOption[]> {
  const result = await locations.fetchCountries();
  if (!result?.success) return [];
  const collator = new Intl.Collator(toLocale(language));
  return (result.payload ?? [])
    .map(country => ({
      _id: country._id,
      code: country.code,
      name: countryName(country, language),
      englishName: countryName(country, 'en_GB'),
    }))
    .sort((a, b) => collator.compare(a.name, b.name));
}

/**
 * A country's name in `language`: the stored one, or else the browser's for its code (the service stores English
 * only), or else any stored name
 */
export function countryName(country: Pick<LocationCountry, 'code' | 'name'>, language: string): string {
  const stored = country.name;
  if (typeof stored === 'string') return stored;
  if (stored?.[language]) return stored[language];
  if (country.code) {
    try {
      const named = regionNames(language).of(country.code);
      if (named && named !== country.code) return named;
    } catch {
      // A code the browser doesn't know
    }
  }
  return stored?.['en_GB'] ?? Object.values(stored ?? {})[0] ?? country.code ?? '';
}

/** The id of an address's country, which a fetch with `populateCountry` gives as the country itself */
export function countryId(country: LocationAddress['country']): string | null {
  if (!country) return null;
  return typeof country === 'string' ? country : country._id;
}

const regionNamesByLanguage = new Map<string, Intl.DisplayNames>();

/** The browser's country names in `language`, made once per language */
function regionNames(language: string): Intl.DisplayNames {
  let names = regionNamesByLanguage.get(language);
  if (!names) {
    names = new Intl.DisplayNames([toLocale(language)], {type: 'region'});
    regionNamesByLanguage.set(language, names);
  }
  return names;
}

/** 'de_DE' → 'de-DE' */
function toLocale(language: string): string {
  return language.replace('_', '-');
}
