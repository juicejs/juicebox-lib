import {Routes} from '@angular/router';
import {ComponentOverride} from '../../../config/base-app.config';
import {applyComponentOverrides} from '../../../config/route-customization';
import {unsavedChangesGuard} from '../../shared/guards/unsaved-changes.guard';

/**
 * The old juicebox entities routes (`main/entities/...`), so links to them keep working: the listing, the create
 * page, and a customer with its tabs beside the compact listing (the split view). A project adds the tabs of its
 * other modules under `details/:id` through componentOverrides.
 */
export function buildEntitiesRoute(overrides?: ComponentOverride[]): Routes {
  return applyComponentOverrides([{
    path: 'entities',
    children: [
      {
        path: '',
        loadComponent: () => import('./listing/entities-listing.component').then(m => m.EntitiesListingComponent),
        // The compact list next to an open customer
        data: {listingPane: true},
      },
      {
        path: 'entity-wizard',
        loadComponent: () => import('./wizard/entity-wizard.component').then(m => m.EntityWizardComponent),
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: 'details/:id',
        data: {splitView: true},
        loadComponent: () => import('./details/entity-details.component').then(m => m.EntityDetailsComponent),
        children: [
          {path: '', redirectTo: 'details-entity', pathMatch: 'full'},
          {
            path: 'details-entity',
            loadComponent: () => import('./details/details-entity/details-entity.component').then(m => m.DetailsEntityComponent),
            canDeactivate: [unsavedChangesGuard],
          },
          {
            path: 'address-entity',
            loadComponent: () => import('./details/address-entity/address-entity.component').then(m => m.AddressEntityComponent),
          },
          {
            path: 'attributes-entity',
            loadComponent: () => import('./details/attributes-entity/attributes-entity.component').then(m => m.AttributesEntityComponent),
          },
          {
            path: 'wallets-entity',
            loadComponent: () => import('./details/wallet-entity/wallet-entity.component').then(m => m.WalletEntityComponent),
          },
          {
            path: 'media-entity',
            loadComponent: () => import('./details/media-entity/media-entity.component').then(m => m.MediaEntityComponent),
          },
          {
            path: 'history-entity',
            loadComponent: () => import('./details/mailing-history/mailing-history.component').then(m => m.MailingHistoryComponent),
          },
          {
            path: 'push-notifications-entity',
            loadComponent: () => import('./details/push-notifications/push-notifications.component').then(m => m.PushNotificationsComponent),
          },
          {
            path: 'payment-entity',
            loadComponent: () => import('./details/payment-entity/payment-entity.component').then(m => m.PaymentEntityComponent),
          },
          {
            path: 'api-access',
            loadComponent: () => import('./details/api-access/api-access.component').then(m => m.ApiAccessComponent),
          },
          // Three pages of the old juicebox that no tab leads to; kept for the projects that link to them
          {
            path: 'documents-entity',
            loadComponent: () => import('./details/documents-entity/documents-entity.component').then(m => m.DocumentsEntityComponent),
          },
          {
            path: 'addlogo-entity',
            loadComponent: () => import('./details/addlogo-entities/addlogo-entities.component').then(m => m.AddlogoEntitiesComponent),
          },
          {
            path: 'prices-entity',
            loadComponent: () => import('./details/prices-entity/prices-entity.component').then(m => m.PricesEntityComponent),
          },
        ],
      },
    ],
  }], overrides);
}
