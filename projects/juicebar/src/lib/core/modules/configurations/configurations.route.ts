import {Routes} from '@angular/router';
import {ComponentOverride} from '../../../config/base-app.config';
import {applyComponentOverrides} from '../../../config/route-customization';

/**
 * /main/configuration, the old juicebox's address: the listing. A configuration is changed in a dialog, so the module
 * has no record page.
 */
export function buildConfigurationsRoute(overrides?: ComponentOverride[]): Routes {
  return applyComponentOverrides([{
    path: 'configuration',
    children: [
      {
        path: '',
        loadComponent: () => import('./listing/configurations-listing.component').then(m => m.ConfigurationsListingComponent),
      },
    ],
  }], overrides);
}
