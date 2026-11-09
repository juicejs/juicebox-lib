import {inject, Injectable} from '@angular/core';
import {MediaDetails, MediaFile} from '../../shared/components/media/media.types';
import {Juice} from '../../shared/services/juice.service';
import {JuiceboxService} from '../../shared/services/Juicebox.service';
import {Result} from '../../shared/types/Result';
import {StoredLocation, LocationCountry, LocationCreate, LocationFetchOptions, LocationUpdate} from './locations.types';

/** The locations service (`locations:service`), as the old juicebox called it; other modules use it too */
@Injectable({providedIn: 'root'})
export class LocationsService {
  private readonly juice = inject(Juice);
  private readonly juicebox = inject(JuiceboxService);

  get(locationId: string): Promise<Result<StoredLocation>> {
    return this.request('getLocation', [locationId]);
  }

  /** Name and description are stored in the juicebox language */
  put(locationId: string, data: LocationUpdate): Promise<Result<{location: StoredLocation}>> {
    return this.request('updateLocation', [locationId, data, this.juicebox.getLanguage()]);
  }

  fetch(page: number, pageSize: number, options: LocationFetchOptions): Promise<Result<{locations: StoredLocation[]; count: number}>> {
    return this.request('fetch', [page, pageSize, options]);
  }

  create(data: LocationCreate): Promise<Result<{location: StoredLocation}>> {
    return this.request('createLocation', [data, this.juicebox.getLanguage()]);
  }

  delete(locationId: string): Promise<Result<string>> {
    return this.request('deleteLocation', [locationId]);
  }

  search(
    query: Array<{property: string; fullText: boolean; language: string; term: string}>,
    page: number,
    pageSize: number,
  ): Promise<Result> {
    return this.request('search', [query, page, pageSize]);
  }

  /** Sets the given attributes; the others stay */
  updateAttributes(locationId: string, data: Record<string, unknown>): Promise<Result> {
    return this.request('updateAttributes', [locationId, data]);
  }

  addMedia(locationId: string, media: MediaFile): Promise<Result> {
    return this.request('addMedia', [locationId, media]);
  }

  /** Takes the file (the whole stored object) off the location */
  removeMedia(locationId: string, media: MediaFile): Promise<Result> {
    return this.request('removeMedia', [locationId, media]);
  }

  updateMedia(locationId: string, mediaId: string, data: MediaDetails): Promise<Result<boolean>> {
    return this.request('updateMedia', [locationId, mediaId, data]);
  }

  fetchCountries(): Promise<Result<LocationCountry[]>> {
    return this.request('fetchCountries', []);
  }

  private request<T>(method: string, params: unknown[]): Promise<Result<T>> {
    return this.juice.request('locations:service', method, params);
  }
}
