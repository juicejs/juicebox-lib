import {AbstractControl} from '@angular/forms';
import {TranslationPipe} from '../../shared/pipes/TranslationPipe';

/** The e-mail check of the old create and details forms */
export const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

/** The languages offered; staff may type in others */
export const DEFAULT_LANGUAGES = ['German', 'English', 'French', 'Croatian', 'Italian'];

/** The kinds of address; each is a key of the dictionary */
export const ADDRESS_TYPES = ['shipping', 'invoice', 'home', 'business'];

/** The customer types the attribute dialogs name, as the old juicebox's did; each is a key of the dictionary */
export const ATTRIBUTE_ENTITY_TYPES = ['private', 'commercial', 'public', 'organisation'];

/** The phone fields take digits, "+", "-" and spaces */
const PHONE_KEY = /[0-9+\- ]/;

export interface ChoiceOption {
  code: string;
  name: string;
}

/**
 * The value of a single choice as the old admin sent it: one never made is an empty list (its form control started
 * with one), one made and cleared again is null.
 */
export function choiceValue(control: AbstractControl): unknown {
  return control.value ?? (control.pristine ? [] : null);
}

/**
 * What the old create form sent to `entities#createEntity`: the form's fields, with the street, postcode, city and
 * country as the customer's first address — business with a company name, home without.
 */
export function newEntityData(value: Record<string, unknown>, isProtected: boolean): Record<string, unknown> {
  const data = {...value};
  if (data['street'] || data['postcode'] || data['city'] || data['country']) {
    data['address'] = {
      type: data['name'] ? 'business' : 'home',
      street: data['street'],
      street2: data['street2'],
      name: data['name'],
      postcode: data['postcode'],
      city: data['city'],
      country: data['country'],
    };
    for (const key of ['street', 'street2', 'postcode', 'city', 'country']) delete data[key];
  } else {
    data['address'] = {street: '', street2: '', name: '', postcode: '', city: '', country: ''};
  }
  if (isProtected) data['protected'] = true;
  return data;
}

/** The languages to choose from: the standard ones in the admin's language, then those chosen or typed beyond them */
export function languageOptions(i18n: TranslationPipe, chosen: readonly string[] | null | undefined, typed = ''): ChoiceOption[] {
  const options = DEFAULT_LANGUAGES.map(code => ({code, name: String(i18n.transform(code))}));
  const term = typed.trim();
  const extra = [...(chosen ?? []), ...(term ? [term] : [])];
  for (const code of extra) {
    const known = options.some(option => option.code === code || option.name.toLowerCase() === code.toLowerCase());
    if (!known) options.push({code, name: code});
  }
  return term ? options.filter(option => option.name.toLowerCase().includes(term.toLowerCase())) : options;
}

/** Keeps a key that is not part of a phone number from being typed */
export function allowPhoneKey(event: KeyboardEvent): void {
  if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !PHONE_KEY.test(event.key)) event.preventDefault();
}
