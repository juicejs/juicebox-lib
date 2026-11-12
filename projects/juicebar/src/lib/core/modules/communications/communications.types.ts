/**
 * The communications module's records (aim/juicebar/communications) and what `communication-service` answers. The
 * service answers some calls with a `Result`, some with a plain object or array and some with a bare value; the types
 * below follow the backend as it is (Juice 4.4 and `@juicejs/communications` alike).
 */

/** The kinds of delivery a channel uses (its `adapter`) */
export const CHANNEL_ADAPTERS = {
  email: 'email-communication-channel',
  push: 'push-communication-channel',
  sms: 'sms-communication-channel',
} as const;

/** An entry of the `communications:channel` configuration */
export interface CommunicationChannel {
  _id?: string;
  key: string;
  name: string;
  adapter: string;
  [extra: string]: unknown;
}

/** A recipient provider registered under `communications:recipients` (its `__meta`) */
export interface RecipientProviderMeta {
  key: string;
  name: string;
  [extra: string]: unknown;
}

/** An event of the `communications` configuration */
export interface CommunicationEvent {
  key: string;
  name: string;
  event: string;
}

export type SelectionType =
  | 'customer_list'
  | 'customer_group'
  | 'event_params'
  | 'attributes_filter'
  | 'form_customers'
  | 'firebase_customer_list';

export type RecipientParameter = 'email' | 'wallet' | 'phone';

/** A recipient provider with its parameters; a quick send's recipient holds `ref` and `params` alone */
export interface CommunicationRecipient {
  _id?: string;
  ref: string;
  params?: string;
  inputType?: SelectionType;
  parameter?: RecipientParameter;
  customerIDs?: string[];
}

export type ScheduledTimeStatus = 'pending' | 'started' | 'failed' | 'cancelled' | 'done';

export interface ScheduledTime {
  ref: string;
  time: string;
  status: ScheduledTimeStatus;
  /** The task of the run once the time started it */
  q?: string;
}

/** An automation: a communication kept to run again */
export interface Communication {
  _id: string;
  name?: string;
  key?: string;
  active?: boolean;
  event?: string;
  channel?: string;
  /** A content's id; null once it was cleared */
  content?: string | null;
  subject?: string;
  recipients?: CommunicationRecipient[];
  count?: number;
  scheduledTimestamps?: ScheduledTime[];
  organisation_id?: string;
}

/** A named subject and text with placeholders; the module's contents have a type beginning with `communications` */
export interface CommunicationContent {
  _id: string;
  name?: string;
  type?: string;
  subject?: string;
  template?: string;
  tag?: string;
  key?: string;
  active?: boolean;
  organisation_id?: string;
}

/** The record of one run */
export interface HistoryEntry {
  _id: string;
  communication_id?: string;
  date: string;
  user_id?: string;
  organisation_id?: string;
  channel?: string;
  subject?: string;
  template?: string;
  recipients?: CommunicationRecipient[];
  event?: unknown;
  started?: boolean;
  done?: boolean;
  failed?: boolean;
  error?: string;
  [extra: string]: unknown;
}

/** The backend's task that carries out one run */
export interface TaskQueue {
  _id: string;
  progress?: number;
  done?: boolean;
  failed?: boolean;
  parameters?: {communicationId?: string};
  [extra: string]: unknown;
}

/** A term of a listing's search: `fullText` matches the text anywhere in the property, in any case */
export interface CommunicationSearchTerm {
  property: string;
  term: string;
  fullText?: boolean;
  language?: string | boolean;
}

/**
 * The listing options `fetchCommunications`, `fetchContents` and `getCommunicationsHistory` take, as the backend
 * reads them (the history ignores them)
 */
export interface CommunicationListOptions {
  /** Keeps what matches any of the terms */
  search?: {terms: CommunicationSearchTerm[]};
  /** Keeps what matches every property's term: as a regular expression, or as it is with `fullText` */
  filter?: Record<string, {term: string; fullText?: boolean}>;
  [extra: string]: unknown;
}

/** `{success: false, error}` the service answers when it refuses */
export interface ServiceFailure {
  success: false;
  error?: string;
}

/** What `send` and `sendCommunication` answer: the task carrying out the run */
export interface RunStarted {
  success: boolean;
  queue?: string;
  error?: string;
}
