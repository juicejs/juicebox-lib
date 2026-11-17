import {inject} from '@angular/core';
import {ENTITIES_CUSTOMIZATION, EntitiesOptions} from '../../../config/base-app.config';
import {CustomTab, getCustomTabs} from '../../../config/route-customization';
import {TranslationPipe} from '../../shared/pipes/TranslationPipe';
import {ConfigurationService} from '../../shared/services/configuration.service';
import {JuiceboxService} from '../../shared/services/Juicebox.service';
import {EntitiesTranslationPipe} from './i18n/entities.translation';
import {Entity, EntityAttribute, EntitySettings, EntityType} from './entities.types';

/** The listing's address, where the breadcrumb leads back */
export const ENTITIES_URL = '/main/entities';

/** The project's customers options (provideEntities({ options })). Call in an injection context. */
export function injectEntitiesOptions(): EntitiesOptions {
  return inject(ENTITIES_CUSTOMIZATION, {optional: true})?.options ?? {};
}

/**
 * Tabs the project adds to an opened customer through componentOverrides (its tickets, purchases, bookings …),
 * for the staff who may see them, with translated labels. Call in an injection context.
 */
export function injectCustomEntityTabs(): CustomTab[] {
  const overrides = inject(ENTITIES_CUSTOMIZATION, {optional: true})?.componentOverrides;
  const i18n = inject(EntitiesTranslationPipe);
  return getCustomTabs(overrides, ['details/:id'], inject(JuiceboxService))
    .map(tab => ({...tab, label: translatedOr(i18n, tab.label)}));
}

/** The dictionary's text for a name that comes from a configuration, or the name itself where it has none */
export function translatedOr(i18n: TranslationPipe, name: string): string {
  const text = i18n.transform(name);
  return typeof text === 'string' && text && !text.startsWith('@') ? text : name;
}

/** The options of the `entities:juicebox:settings` configuration: the customer types, and two switches */
export async function loadEntitySettings(configuration: ConfigurationService): Promise<EntitySettings> {
  const result = await configuration.getByKey('entities:juicebox:settings');
  return result?.payload?.options ?? {};
}

/** The customer types with their names in the admin's language */
export function translatedTypes(settings: EntitySettings, i18n: TranslationPipe): EntityType[] {
  return (settings.types ?? []).map(type => ({...type, name: translatedOr(i18n, type.name)}));
}

/** Whether the backend has an `amgshop` configuration: calling numbers, the "Customer group" column, other modules' buttons */
export async function hasAmgShop(configuration: ConfigurationService): Promise<boolean> {
  const result = await configuration.getByKey('amgshop');
  return !!result?.success;
}

/** The attribute fields the project keeps for its customers (`juicecommerce:entity:attribute`) */
export async function loadEntityAttributes(configuration: ConfigurationService): Promise<EntityAttribute[]> {
  const result = await configuration.getBySchema('juicecommerce:entity:attribute');
  return result?.success && Array.isArray(result.payload) ? result.payload : [];
}

/** An attribute field's name in the admin's language: the dictionary's text for it, its own text per language, or the name as given */
export function attributeName(attribute: EntityAttribute, i18n: TranslationPipe, language: string): string {
  const name = attribute.name;
  if (typeof name === 'string') return translatedOr(i18n, name);
  return name?.[language] ?? Object.values(name ?? {})[0] ?? attribute.property;
}

/** How the module names a customer: first and last name, or else the company or organisation name */
export function entityName(entity: Pick<Entity, 'firstname' | 'lastname' | 'name'> | null | undefined): string {
  if (entity?.firstname && entity.lastname) return `${entity.firstname} ${entity.lastname}`;
  return entity?.name ?? '';
}

/** How the listing names a customer it asks about: an organisation by its name, else by first and last name, else by e-mail */
export function listedEntityName(entity: Entity): string {
  if (entity.type === 'organisation') return entity.name ?? '';
  if (entity.firstname && entity.lastname) return `${entity.firstname} ${entity.lastname}`;
  return entity.email ?? '';
}

/** The value at a dot path of a customer, e.g. `attributes.segment` */
export function valueAt(record: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (value, key) => (value !== null && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined),
    record,
  );
}
