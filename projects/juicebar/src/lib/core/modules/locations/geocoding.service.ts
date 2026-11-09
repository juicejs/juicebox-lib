import {HttpBackend, HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {firstValueFrom} from 'rxjs';
import {LocationCoordinates} from './locations.types';

/** Esri's free address search, the one the old juicebox used (leaflet-geosearch's EsriProvider); it needs no key */
const ESRI_FIND = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/find';

interface EsriFindResponse {
  locations?: Array<{feature?: {geometry?: {x: number; y: number}}}>;
}

/** Coordinates of an address, for the location's `attributes.coordinates` */
@Injectable({providedIn: 'root'})
export class GeocodingService {
  /** Past the app's interceptors: the address goes to Esri without the app's headers */
  private readonly http = new HttpClient(inject(HttpBackend));

  /** The first match for "country, city, street", or null when there is none or the search fails */
  async coordinatesOf(street: string, city: string, country: string): Promise<LocationCoordinates | null> {
    if (!street || !city || !country) return null;
    try {
      const response = await firstValueFrom(this.http.get<EsriFindResponse>(ESRI_FIND, {
        params: {text: `${country}, ${city}, ${street}`, f: 'json'},
      }));
      const point = response?.locations?.[0]?.feature?.geometry;
      return point ? {latitude: Number(point.y), longitude: Number(point.x)} : null;
    } catch {
      return null;
    }
  }
}
