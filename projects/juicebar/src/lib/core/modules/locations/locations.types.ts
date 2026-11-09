import {MediaFile, PerLanguage} from '../../shared/components/media/media.types';

/**
 * A country of the `locations.countries` collection (`fetchCountries`). The service names it per language and fills
 * in English (`en_GB`) from its own list; a project may add other languages.
 */
export interface LocationCountry {
  _id: string;
  code: string;
  name?: PerLanguage | string;
  callingCode?: string;
}

export interface LocationAddress {
  street?: string | null;
  city?: string | null;
  postcode?: string | null;
  /** The country's id; populated with the country itself when fetched with `populateCountry` */
  country?: string | LocationCountry | null;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationAttributes {
  coordinates?: LocationCoordinates | null;
  email?: string;
  /** The availability calendar's pattern for this location, 0 (none) to 12 */
  hatching_pattern?: number;
  /** Ids of the room plans of a venue */
  roomPlans?: string[];
  /** Attributes from the `juicecommerce:location:attribute` configurations (stadiums and halls) */
  [property: string]: unknown;
}

export interface StoredLocation {
  _id: string;
  name?: PerLanguage;
  short_name?: string | null;
  description?: PerLanguage | null;
  type?: string;
  location_category?: string | null;
  url?: string | null;
  address?: LocationAddress[];
  archived?: boolean;
  /** Set by the backend for locations that must stay active */
  cannotArchive?: boolean;
  organisation_id?: string;
  organisation_visibility?: boolean;
  accessibility?: boolean;
  attributes?: LocationAttributes;
  media?: MediaFile[];
}

/** A location type of the `location:type` configurations; users see the ones whose permissions they have */
export interface LocationType {
  value: string;
  name?: string;
  localised_name?: PerLanguage;
  /** `locations:role#<permission>` names; the type is for everyone without them */
  permissions?: string[];
}

/** A location category of the `location:category` configurations */
export interface LocationCategory {
  value: string;
  name?: string;
  localised_name?: PerLanguage;
}

/** An attribute field of the `juicecommerce:location:attribute` configurations */
export interface LocationAttributeField {
  name: string;
  property: string;
  /** The input type, e.g. 'number' */
  datatype?: string;
  required?: boolean;
  /** 'location:stadion' or 'location:hall' */
  model?: string;
}

/** What `updateLocation` stores, as the old details form sent it */
export interface LocationUpdate {
  name: string | null;
  short_name: string | null;
  description: string | null;
  address: {street: string | null; city: string | null; postcode: string | null; country: string | null};
  type: string | null;
  location_category: string | null;
  url: string | null;
  archived: boolean;
  organisation_visibility?: boolean;
  accessibility?: boolean;
  attributes: LocationAttributes;
}

/** What `createLocation` stores, as the old wizard sent it */
export interface LocationCreate {
  name: string | null;
  short_name: string | null;
  description: string | null;
  street: string | null;
  city: string | null;
  postcode: string | null;
  country: string | null;
  type: string | null;
  location_category: string | null;
  url: string | null;
  archived: boolean;
  organisation_visibility: boolean;
  accessibility?: boolean;
  attributes: LocationAttributes;
}

export interface LocationFetchOptions {
  filters?: {
    archived?: boolean;
    /** Header filters, e.g. `{key: 'name.en_GB', value: 'Ber'}` */
    typed?: Array<{key: string; value: string}>;
    sort?: {prop: string; dir: string};
    types?: string[];
  };
  language?: string;
  populateCountry?: boolean;
}
