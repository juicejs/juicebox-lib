import {inject} from '@angular/core';
import {Router} from '@angular/router';
import {CATEGORIES_CUSTOMIZATION, CategoriesOptions} from '../../../config/base-app.config';
import {ConfigurationService} from '../../shared/services/configuration.service';
import {Juice} from '../../shared/services/juice.service';

/** The backend's `juicecommerce:categories` options the module reads, as the old juicebox did */
export interface CategoriesConfiguration {
  /** false: only super admins delete categories (or, with allowRootDelete, see the delete everywhere) */
  allowDelete?: boolean;
  /** Quality Circle: users delete their own organisation's categories that have no children */
  allowRootDelete?: boolean;
  /** Quality Circle: public categories, the Mine / Organisation / All filter and taking categories into Mine */
  showPublic?: boolean;
  openCategoriesInNewTab?: boolean;
}

export const SUPER_ADMIN = 'categories:role#super-admin';

/** The project's categories options (provideCategories({ options })). Call in an injection context. */
export function injectCategoriesOptions(): CategoriesOptions {
  return inject(CATEGORIES_CUSTOMIZATION, {optional: true})?.options ?? {};
}

export async function loadCategoriesConfiguration(configuration: ConfigurationService): Promise<CategoriesConfiguration> {
  const result = await configuration.getByKey('juicecommerce:categories');
  return result?.payload?.options ?? {};
}

/** The configuration sets `allowDelete` and turns it off */
export function deleteRestricted(configuration: CategoriesConfiguration): boolean {
  return 'allowDelete' in configuration && !configuration.allowDelete;
}

/** Quality Circle: the ids of the organisations in the user's organisation tree (the service answers the bare list) */
export async function loadRelatedOrganisations(juice: Juice): Promise<string[]> {
  const result = await juice.request('organisation:service', 'fetchAllRelatedOrgs', [{maxDepth: 4}]).catch(() => null);
  const ids = Array.isArray(result) ? result : result?.payload;
  return Array.isArray(ids) ? ids.map(String) : [];
}

/** The project has an articles module (`main/article`), so the included articles can link to theirs */
export function hasArticlesModule(router: Router): boolean {
  const main = router.config.find(route => route.path === 'main');
  return !!main?.children?.some(route => route.path === 'article');
}
