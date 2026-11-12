import {RecipientParameter, SelectionType} from '../communications.types';

/** A customer of the entities module, as `entities#fetchEntities` and `forms:entities#fetch` give it */
export interface Customer {
  _id: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  wallets?: Array<{address?: string}>;
  [extra: string]: unknown;
}

export interface CustomerGroup {
  _id: string;
  name?: string;
}

/** A `juicecommerce:entity:attribute` configuration: a customer attribute */
export interface CustomerAttribute {
  key?: string;
  name?: string;
  property: string;
  [extra: string]: unknown;
}

/** A form of the forms module (`ticketing:forms`) */
export interface CustomerForm {
  _id: string;
  name?: string;
}

/** A term of `entities#fetchEntities`' `filter` or `search.terms` */
export interface EntityTerm {
  property: string;
  term: unknown;
  fullText?: boolean;
  language?: string | boolean | null;
}

/** Where a selection type's form is used: the quick send or an automation's recipient dialog */
export type RecipientContext = 'send' | 'automation';

/** A choice of a select: its value and the label shown */
export interface ChoiceOption {
  value: string;
  label: string;
}

/** The selection types (SELTYPES), in the old order; each is also its label key */
export const SELECTION_TYPES: readonly SelectionType[] = [
  'customer_list',
  'customer_group',
  'event_params',
  'attributes_filter',
  'form_customers',
  'firebase_customer_list',
];

/** The address an automation's recipient takes from each chosen customer; each is also its label key */
export const RECIPIENT_PARAMETERS: readonly RecipientParameter[] = ['email', 'wallet', 'phone'];

/** The customer's e-mail address, first wallet's address or phone number, where it has one */
export function customerAddress(customer: Customer, parameter: RecipientParameter): string | undefined {
  switch (parameter) {
    case 'email':
      return customer.email || undefined;
    case 'wallet':
      return customer.wallets?.[0]?.address || undefined;
    case 'phone':
      return customer.phone || undefined;
  }
}

/** "first last", or "first last (e-mail)" as the quick send shows a customer */
export function customerLabel(customer: Customer, withEmail: boolean): string {
  const name = `${customer.firstname ?? ''} ${customer.lastname ?? ''}`;
  return withEmail ? `${name} (${customer.email ?? ''})` : name;
}

/**
 * The options of a multiple choice whose list is replaced by each search: the loaded ones, then the chosen ones the
 * list no longer holds, so the chosen ones keep their labels
 */
export function withChosen<T extends {_id: string}>(loaded: readonly T[], chosenIds: readonly string[], known: ReadonlyMap<string, T>): T[] {
  const loadedIds = new Set(loaded.map(item => item._id));
  const kept = chosenIds
    .filter(id => !loadedIds.has(id))
    .map(id => known.get(id))
    .filter((item): item is T => !!item);
  return [...loaded, ...kept];
}

/** The map of the items seen so far with the new ones added */
export function remember<T extends {_id: string}>(known: ReadonlyMap<string, T>, items: readonly T[]): ReadonlyMap<string, T> {
  if (!items.length) return known;
  const next = new Map(known);
  for (const item of items) next.set(item._id, item);
  return next;
}
