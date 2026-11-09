import {TestBed} from '@angular/core/testing';
import {provideJuicebarTesting} from '../../../../testing/juicebar-testing';
import {GeocodingService} from './geocoding.service';
import {createLocationForm, resolveCoordinates} from './location-form';
import {countryName, loadCountries} from './locations-shared';
import {LocationsService} from './locations.service';
import {LocationCountry} from './locations.types';

/** As the locations service stores them: named per language, with English filled in */
const COUNTRIES: LocationCountry[] = [
  {_id: 'de-id', code: 'DE', name: {en_GB: 'Germany'}, callingCode: '+49'},
  {_id: 'at-id', code: 'AT', name: {en_GB: 'Austria', de_DE: 'Österreich (gespeichert)'}, callingCode: '+43'},
];

describe('locations countries', () => {
  async function countries(language: string) {
    TestBed.configureTestingModule({providers: provideJuicebarTesting()});
    vi.spyOn(TestBed.inject(LocationsService), 'fetchCountries').mockResolvedValue({success: true, payload: COUNTRIES});
    return loadCountries(TestBed.inject(LocationsService), language);
  }

  it('names a country in the user\'s language: the stored name, or the browser\'s for its code', async () => {
    expect(await countries('de_DE')).toEqual([
      {_id: 'de-id', code: 'DE', name: 'Deutschland', englishName: 'Germany'},
      {_id: 'at-id', code: 'AT', name: 'Österreich (gespeichert)', englishName: 'Austria'},
    ]);
  });

  it('a name stored as one text is taken as it is', () => {
    expect(countryName({code: 'DE', name: 'Germany'}, 'de_DE')).toBe('Germany');
  });

  it('looks an address up with the stored English name, not the country object the old juicebox sent', async () => {
    const options = await countries('de_DE');
    const geocoding = TestBed.inject(GeocodingService);
    const lookup = vi.spyOn(geocoding, 'coordinatesOf').mockResolvedValue(null);
    const value = {
      ...createLocationForm({}).getRawValue(),
      type: 'geo',
      address: {street: 'Hauptstr. 1', postcode: '10115', city: 'Berlin', country: 'de-id'},
    };
    await resolveCoordinates(value, {}, options, geocoding);
    expect(lookup).toHaveBeenCalledWith('Hauptstr. 1', 'Berlin', 'Germany');
  });
});
