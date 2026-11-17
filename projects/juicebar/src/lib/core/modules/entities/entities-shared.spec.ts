import {TranslationPipe} from '../../shared/pipes/TranslationPipe';
import {attributeName, entityName, listedEntityName, translatedOr, translatedTypes, valueAt} from './entities-shared';
import {EntityAttribute} from './entities.types';

/** A dictionary with one text; every other key comes back as `@key`, as the translation pipe gives it */
const i18n = {transform: (key: string) => (key === 'private' ? 'Privat' : `@${key}`)} as unknown as TranslationPipe;

describe('how the customers module names things', () => {
  it('a customer by first and last name, or else by its company or organisation name', () => {
    expect(entityName({firstname: 'Ada', lastname: 'Lovelace', name: 'Acme'})).toBe('Ada Lovelace');
    expect(entityName({firstname: 'Ada', name: 'Acme'})).toBe('Acme');
    expect(entityName({})).toBe('');
    expect(entityName(null)).toBe('');
  });

  it('in the listing\'s question: an organisation by its name, else first and last name, else the e-mail address', () => {
    expect(listedEntityName({_id: '1', type: 'organisation', name: 'Acme', firstname: 'Ada', lastname: 'L'})).toBe('Acme');
    expect(listedEntityName({_id: '2', type: 'private', firstname: 'Ada', lastname: 'Lovelace'})).toBe('Ada Lovelace');
    expect(listedEntityName({_id: '3', type: 'private', email: 'ada@example.com'})).toBe('ada@example.com');
  });

  it('a configured name in the admin\'s language where the dictionary has it, else as it is', () => {
    expect(translatedOr(i18n, 'private')).toBe('Privat');
    expect(translatedOr(i18n, 'Trainee')).toBe('Trainee');
    expect(translatedTypes({types: [{name: 'private', prop: 'private', columns: []}]}, i18n)[0].name).toBe('Privat');
    expect(translatedTypes({}, i18n)).toEqual([]);
  });

  it('an attribute field by the dictionary, by its own text in the admin\'s language, or by its name', () => {
    const field = (name: EntityAttribute['name']): EntityAttribute =>
      ({key: 'segment:entity:private', property: 'segment', model: 'entity:private', datatype: 'text', name});
    expect(attributeName(field('private'), i18n, 'de_DE')).toBe('Privat');
    expect(attributeName(field('Segment'), i18n, 'de_DE')).toBe('Segment');
    expect(attributeName(field({en_GB: 'Segment', de_DE: 'Bereich'}), i18n, 'de_DE')).toBe('Bereich');
    expect(attributeName(field({en_GB: 'Segment'}), i18n, 'de_DE')).toBe('Segment');
  });

  it('reads a column\'s value by its path', () => {
    const customer = {lastname: 'Lovelace', attributes: {segment: 'Gold'}};
    expect(valueAt(customer, 'lastname')).toBe('Lovelace');
    expect(valueAt(customer, 'attributes.segment')).toBe('Gold');
    expect(valueAt(customer, 'mappings.SAP.external_id')).toBeUndefined();
  });
});
