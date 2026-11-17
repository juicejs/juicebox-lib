import {FormControl} from '@angular/forms';
import {TranslationPipe} from '../../shared/pipes/TranslationPipe';
import {allowPhoneKey, choiceValue, EMAIL_PATTERN, languageOptions, newEntityData} from './entity-form';

/** A dictionary that knows German */
const i18n = {transform: (key: string) => (key === 'German' ? 'Deutsch' : key)} as unknown as TranslationPipe;

describe('the create form\'s payload (newEntityData)', () => {
  const typed = {firstname: 'Ada', lastname: 'Lovelace', email: 'ada@example.com', type: 'private', street: '', street2: '', postcode: '', city: ''};

  it('makes the typed address the first address: a business address with a company name', () => {
    const data = newEntityData({...typed, name: 'Acme', city: 'Berlin', country: 'DE'}, false);
    expect(data['address']).toEqual({type: 'business', street: '', street2: '', name: 'Acme', postcode: '', city: 'Berlin', country: 'DE'});
    // The address's fields go out as the address only
    expect('city' in data || 'country' in data || 'street' in data).toBe(false);
    expect(data['name']).toBe('Acme');
  });

  it('a home address without a company name', () => {
    const data = newEntityData({...typed, name: '', city: 'Graz', country: 'AT'}, false);
    expect(data['address']).toEqual(expect.objectContaining({type: 'home', city: 'Graz', country: 'AT'}));
  });

  it('a country never chosen (an empty list) still makes an address, as the old form did', () => {
    const data = newEntityData({...typed, name: '', country: []}, false);
    expect(data['address']).toEqual({type: 'home', street: '', street2: '', name: '', postcode: '', city: '', country: []});
  });

  it('nothing typed and the country cleared: an empty address, the fields staying as they stand', () => {
    const data = newEntityData({...typed, name: '', country: null}, false);
    expect(data['address']).toEqual({street: '', street2: '', name: '', postcode: '', city: '', country: ''});
    expect(data['country']).toBeNull();
    expect(data['city']).toBe('');
  });

  it('marks the customer protected only when the switch is on', () => {
    expect(newEntityData({...typed, country: []}, true)['protected']).toBe(true);
    expect('protected' in newEntityData({...typed, country: []}, false)).toBe(false);
  });
});

describe('choiceValue', () => {
  it('a choice never made is an empty list, one cleared again is null, one made is its value', () => {
    const control = new FormControl<string | null>(null);
    expect(choiceValue(control)).toEqual([]);
    control.setValue('Mr');
    control.markAsDirty();
    expect(choiceValue(control)).toBe('Mr');
    control.setValue(null);
    expect(choiceValue(control)).toBeNull();
  });
});

describe('languageOptions', () => {
  it('offers the standard languages in the admin\'s language, then those chosen beyond them', () => {
    const options = languageOptions(i18n, ['German', 'Klingon']);
    expect(options[0]).toEqual({code: 'German', name: 'Deutsch'});
    expect(options.map(option => option.code)).toEqual(['German', 'English', 'French', 'Croatian', 'Italian', 'Klingon']);
  });

  it('offers the languages that contain what is typed, and what is typed as a language of its own (ng-select\'s addTag)', () => {
    expect(languageOptions(i18n, [], 'Span')).toEqual([{code: 'Span', name: 'Span'}]);
    expect(languageOptions(i18n, [], 'deu')).toEqual([{code: 'German', name: 'Deutsch'}, {code: 'deu', name: 'deu'}]);
    // A language that is there already is not offered twice
    expect(languageOptions(i18n, [], 'deutsch')).toEqual([{code: 'German', name: 'Deutsch'}]);
  });
});

describe('the forms\' checks', () => {
  it('the e-mail pattern is the old forms\'', () => {
    expect(EMAIL_PATTERN.test('ada@example.com')).toBe(true);
    expect(EMAIL_PATTERN.test('ada@localhost')).toBe(true);
    expect(EMAIL_PATTERN.test('ada example.com')).toBe(false);
  });

  it('a phone field takes digits, plus, minus and spaces, and leaves the other keys alone', () => {
    const typedKey = (key: string, ctrlKey = false) => {
      const event = new KeyboardEvent('keydown', {key, ctrlKey, cancelable: true});
      allowPhoneKey(event);
      return !event.defaultPrevented;
    };
    expect(['4', '+', '-', ' '].every(key => typedKey(key))).toBe(true);
    expect(typedKey('a')).toBe(false);
    expect(typedKey('Backspace')).toBe(true);
    expect(typedKey('v', true)).toBe(true);
  });
});
