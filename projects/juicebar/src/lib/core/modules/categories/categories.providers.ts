import {makeEnvironmentProviders} from '@angular/core';
import {CATEGORIES_CUSTOMIZATION, CategoriesCustomization, JuicebarFeature} from '../../../config/base-app.config';
import {CategoriesTranslationPipe} from './i18n/categories.translation';
import {buildCategoriesRoute} from './categories.route';

/**
 * The categories module (the old juicebox `categories`), with a sidebar entry for `categories:role`. Quality Circle's
 * extras are the backend configuration's (showPublic, allowRootDelete) and options:
 * `provideCategories({options: {showInactive: true, confirmDeactivation: true, subcategoriesActive: true}})`.
 * A project's own tabs (e.g. SEO) are componentOverrides with a `tab` under `['details/:id', …]`.
 */
export function provideCategories(customization?: CategoriesCustomization): JuicebarFeature {
  return {
    routes: buildCategoriesRoute(customization?.componentOverrides),
    providers: makeEnvironmentProviders([
      CategoriesTranslationPipe,
      ...(customization?.providers ?? []),
      {provide: CATEGORIES_CUSTOMIZATION, useValue: customization ?? {}},
    ]),
  };
}
