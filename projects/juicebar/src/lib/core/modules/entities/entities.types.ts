/** A customer (the backend's entity) as the `entities` service keeps it: a person, a company or an organisation */
export interface Entity {
  _id: string;
  type?: string;
  salutation?: string;
  sex?: string;
  title?: string;
  firstname?: string;
  lastname?: string;
  name?: string;
  taxNumber?: string;
  email?: string;
  phone?: string;
  mobilephone?: string;
  languages?: string[];
  /** Ids of the customer's groups */
  groups?: string[];
  addresses?: EntityAddress[];
  /** The values of the type's attribute fields, by property, and what the backend keeps beside them (fees, calling numbers) */
  attributes?: Record<string, unknown>;
  wallets?: EntityWallet[];
  media?: EntityMedia[];
  /** The customer's images, such as an organisation's logo, each stored in three sizes */
  images?: EntityImage[];
  /** The form entry the customer came in with; files uploaded for the customer are sent to it */
  form_data?: string;
  organisation_id?: string;
  /** The id of the staff member who made the customer visible only for themselves */
  protected?: string;
  /** Set by the backend for a customer that must stay */
  noDelete?: boolean;
  /** The customer's number in a synchronised system, e.g. SAP */
  mappings?: {SAP?: {external_id?: string}};
}

/** An image of a customer; the paths are below the backend's address */
export interface EntityImage {
  _id: string;
  small?: string;
  medium?: string;
  large?: string;
}

/** A file a customer sent with a form, kept under the customer's `attributes.files` */
export interface EntityFormFile {
  _id: string;
  name?: string;
  mimetype?: string;
}

export interface EntityAddress {
  _id?: string;
  /** `shipping`, `invoice`, `home` or `business`; `default` when stored without one */
  type?: string;
  name?: string;
  street?: string;
  street2?: string;
  postcode?: string;
  city?: string;
  /** A country code of the admin's list */
  country?: string;
  active?: boolean;
}

export interface EntityGroup {
  _id: string;
  name: string;
  organisation_id?: string;
}

/** A customer type of the `entities:juicebox:settings` configuration, with the listing's columns for it */
export interface EntityType {
  name: string;
  /** Empty for the type that lists the customers of every type */
  prop: string;
  columns: EntityColumn[];
}

/** `prop` is the path of the customer's field the column shows; some values have a column of their own kind */
export interface EntityColumn {
  name: string;
  prop: string;
}

/** What the module reads of the `entities:juicebox:settings` configuration */
export interface EntitySettings {
  types?: EntityType[];
  /** Switches "Customer only visible for me" on in the create form */
  default_protected_value?: boolean | null;
  /** Shows the attribute values under a customer's details */
  additionalAttributes?: boolean;
}

/** An attribute field of one customer type: a `juicecommerce:entity:attribute` configuration */
export interface EntityAttribute {
  key: string;
  property: string;
  /** Some fields keep their name as one text per language */
  name: string | Record<string, string>;
  /** `entity:` and the customer type's value */
  model: string;
  datatype: 'text' | 'number' | 'date' | 'dropdown' | 'checkbox';
  /** The choices of a dropdown */
  values?: string[];
  required?: boolean;
  internationalization?: boolean;
}

export interface EntityWallet {
  name?: string;
  address: string;
}

export interface EntityMedia {
  _id: string;
  fileName: string;
  /** A media type of the `entities` configuration, and `type` one of its kinds */
  mediaType: string;
  type?: string;
  title?: Record<string, string> | string;
  description?: Record<string, string> | string;
  path?: string;
  attributes?: EntityMediaAttributes;
}

export interface EntityMediaAttributes {
  /** The file's extension */
  fileType?: string;
  /** In bytes */
  fileSize?: number;
}

/** A media type of the `entities` configuration's `mediaTypes`, with its kinds */
export interface EntityMediaType {
  name: string;
  prop: string;
  types?: Array<{name: string; prop: string}>;
}

/** What `entities#uploadMedia` and `entities#updateMedia` take beside the file */
export interface EntityMediaData {
  mediaType?: string;
  type?: string;
  title: string;
  description: string;
  language: string;
  fileName?: string;
}

/** A term of the listing's filter, as `entities#fetchEntities` takes it */
export interface EntitySearchTerm {
  property: string;
  term: string;
  fullText: boolean;
  language: string | false;
  type?: string;
  languages?: string[] | null;
}

export interface EntitySort {
  prop: string;
  dir: 'asc' | 'desc';
}

/** The options of `entities#fetchEntities` */
export interface EntityFetchOptions {
  /** A customer type's value; other modules also pass a query on the type, e.g. `{$ne: 'organisation'}` */
  type?: string | Record<string, unknown> | null;
  organisation?: string | null;
  sort?: EntitySort;
  filter?: EntitySearchTerm[];
  search?: {terms: EntitySearchTerm[]};
  attribute?: Record<string, unknown> | null;
  /** The fields to read; all of them without it */
  fields?: unknown;
}

/** A page of customers or groups */
export interface EntityPage<T> {
  count: number;
  items: T[];
}

/** An asset publisher of the project's ledger */
export interface WalletPublisher {
  id: string;
  title: string;
  organisation_id?: string;
}

/** A mailing provider, and whether it keeps a history of what it sent */
export interface MailingProvider {
  key: string;
  name: string;
  history_available?: boolean;
}

/** An e-mail a mailing provider recorded for a customer */
export interface MailingHistoryItem {
  subject?: string;
  last_event_time?: string;
  status?: string;
  opens_count?: number;
  clicks_count?: number;
  /** The e-mail's text, where the provider kept it */
  template?: string;
}

/** A push notification the shop sent to a customer */
export interface PushNotification {
  content?: {notification?: {title?: string; body?: string}};
  _assets?: string;
  _offers?: string;
  date?: string;
}

/** An API key of an organisation */
export interface ApiKey {
  _id: string;
  name: string;
  created?: string;
  createdBy?: ApiKeyAuthor;
}

export interface ApiKeyAuthor {
  _id?: string;
  email?: string;
}
