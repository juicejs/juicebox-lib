import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {GeocodingService} from './geocoding.service';

const ESRI_FIND = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/find';

describe('GeocodingService', () => {
  function setup() {
    TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting()]});
    return {service: TestBed.inject(GeocodingService), http: TestBed.inject(HttpTestingController)};
  }

  it('asks Esri for "country, city, street" and takes the first match', async () => {
    const {service, http} = setup();
    const coordinates = service.coordinatesOf('Hauptstr. 1', 'Berlin', 'Germany');
    const request = http.expectOne(req => req.url === ESRI_FIND);
    expect(request.request.params.get('text')).toBe('Germany, Berlin, Hauptstr. 1');
    expect(request.request.params.get('f')).toBe('json');
    expect(request.request.headers.keys()).toEqual([]);
    request.flush({locations: [{feature: {geometry: {x: 13.4, y: 52.5}}}]});
    expect(await coordinates).toEqual({latitude: 52.5, longitude: 13.4});
  });

  it('gives null when there is no match or the search fails', async () => {
    const {service, http} = setup();
    const none = service.coordinatesOf('x', 'y', 'z');
    http.expectOne(req => req.url === ESRI_FIND).flush({locations: []});
    expect(await none).toBeNull();

    const failed = service.coordinatesOf('x', 'y', 'z');
    http.expectOne(req => req.url === ESRI_FIND).error(new ProgressEvent('offline'));
    expect(await failed).toBeNull();
  });
});
