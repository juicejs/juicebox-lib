import {TestBed} from '@angular/core/testing';
import {LocationsOptions} from '../../../config/base-app.config';
import {GeocodingService} from './geocoding.service';
import {
  createLocationForm,
  LocationFormValue,
  resolveCoordinates,
  storedLocationUpdate,
  toLocationCreate,
  toLocationUpdate,
} from './location-form';
import {CountryOption} from './locations-shared';
import {StoredLocation} from './locations.types';

const QC: LocationsOptions = {fields: ['email', 'accessibility', 'coordinates'], shortNameMaxLength: 19};
const germany: CountryOption = {_id: 'de-id', code: 'DE', name: 'Deutschland', englishName: 'Germany'};

function value(changes: Partial<LocationFormValue> = {}): LocationFormValue {
  return {
    ...createLocationForm({}).getRawValue(),
    type: 'geo',
    name: 'Halle',
    short_name: 'H',
    description: 'Eine Halle',
    address: {street: 'Hauptstr. 1', postcode: '10115', city: 'Berlin', country: 'de-id'},
    ...changes,
  };
}

describe('location form', () => {
  it('creates a location with the old wizard\'s fields; without the QC fields there is no accessibility or email', () => {
    expect(toLocationCreate(value(), {}, {latitude: 52.5, longitude: 13.4})).toEqual({
      name: 'Halle',
      short_name: 'H',
      description: 'Eine Halle',
      street: 'Hauptstr. 1',
      city: 'Berlin',
      postcode: '10115',
      country: 'de-id',
      type: 'geo',
      location_category: null,
      url: null,
      archived: false,
      organisation_visibility: false,
      attributes: {coordinates: {latitude: 52.5, longitude: 13.4}},
    });
  });

  it('creates a QC location with accessibility and the email in its attributes', () => {
    const created = toLocationCreate(value({email: 'halle@example.com', accessibility: true}), QC, null);
    expect(created.accessibility).toBe(true);
    expect(created.attributes).toEqual({email: 'halle@example.com'});
  });

  it('a web location has a URL and no address or description', () => {
    const created = toLocationCreate(value({type: 'web', url: 'https://example.com'}), {}, null);
    expect(created).toEqual(expect.objectContaining({
      url: 'https://example.com', description: null, street: null, city: null, postcode: null, country: null,
    }));
  });

  it('an update sends the stored attributes along, as the service replaces them', () => {
    const stored: StoredLocation = {_id: 'l1', attributes: {hatching_pattern: 3, roomPlans: ['r1'], email: 'old@example.com'}};
    const update = toLocationUpdate(value({email: ''}), stored, QC, {latitude: 1, longitude: 2});
    // An emptied email is taken off the location
    expect(update.attributes).toEqual({hatching_pattern: 3, roomPlans: ['r1'], coordinates: {latitude: 1, longitude: 2}});
    expect(update.address).toEqual({street: 'Hauptstr. 1', postcode: '10115', city: 'Berlin', country: 'de-id'});
    expect(update.url).toBeNull();
  });

  it('archives a listed location with its own values, the name in the user\'s language', () => {
    const stored: StoredLocation = {
      _id: 'l1', name: {de_DE: 'Halle', en_GB: 'Hall'}, description: {de_DE: 'Groß'}, type: 'web', url: 'https://example.com',
      address: [{street: null, city: null, postcode: null, country: {_id: 'de-id', code: 'DE', name: {en_GB: 'Germany'}}}],
      accessibility: true, attributes: {email: 'a@example.com'},
    };
    expect(storedLocationUpdate(stored, 'de_DE', 'Halle', true)).toEqual(expect.objectContaining({
      name: 'Halle', description: 'Groß', archived: true, accessibility: true, url: 'https://example.com',
      address: {street: null, city: null, postcode: null, country: 'de-id'},
      attributes: {email: 'a@example.com'},
    }));
  });

  describe('coordinates', () => {
    function geocoding() {
      TestBed.configureTestingModule({});
      const service = TestBed.inject(GeocodingService);
      const lookup = vi.spyOn(service, 'coordinatesOf').mockResolvedValue({latitude: 52.5, longitude: 13.4});
      return {service, lookup};
    }

    it('looks the address up with the country\'s English name', async () => {
      const {service, lookup} = geocoding();
      expect(await resolveCoordinates(value(), {}, [germany], service)).toEqual({coordinates: {latitude: 52.5, longitude: 13.4}});
      expect(lookup).toHaveBeenCalledWith('Hauptstr. 1', 'Berlin', 'Germany');
    });

    it('takes coordinates typed in over the address, and wants both of them in range', async () => {
      const {service, lookup} = geocoding();
      expect(await resolveCoordinates(value({latitude: 48.1, longitude: 11.6}), QC, [germany], service))
        .toEqual({coordinates: {latitude: 48.1, longitude: 11.6}});
      expect(lookup).not.toHaveBeenCalled();
      expect(await resolveCoordinates(value({latitude: 48.1}), QC, [germany], service)).toEqual({error: 'coordinates_pair_required'});
      expect(await resolveCoordinates(value({latitude: 91, longitude: 0}), QC, [germany], service)).toEqual({error: 'coordinates_invalid'});
    });

    it('a web location has none', async () => {
      const {service, lookup} = geocoding();
      expect(await resolveCoordinates(value({type: 'web'}), {}, [germany], service)).toEqual({coordinates: null});
      expect(lookup).not.toHaveBeenCalled();
    });
  });
});
