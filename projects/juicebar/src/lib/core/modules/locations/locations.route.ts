import {Routes} from '@angular/router';
import {ComponentOverride} from '../../../config/base-app.config';
import {applyComponentOverrides} from '../../../config/route-customization';
import {unsavedChangesGuard} from '../../shared/guards/unsaved-changes.guard';

/** The old juicebox location routes (`main/location/...`), so links to them keep working */
export function buildLocationsRoute(overrides?: ComponentOverride[]): Routes {
  return applyComponentOverrides([{
    path: 'location',
    children: [
      {
        path: '',
        loadComponent: () => import('./listing/location-listing.component').then(m => m.LocationListingComponent),
        // The compact list next to an open record (the split view)
        data: {listingPane: true},
      },
      {
        path: 'location-wizard',
        loadComponent: () => import('./wizard/location-wizard.component').then(m => m.LocationWizardComponent),
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: 'details/:id',
        data: {splitView: true},
        loadComponent: () => import('./details/location-details.component').then(m => m.LocationDetailsComponent),
        children: [
          {path: '', redirectTo: 'details-location', pathMatch: 'full'},
          {
            path: 'details-location',
            loadComponent: () => import('./details/details-location/details-location.component').then(m => m.DetailsLocationComponent),
            canDeactivate: [unsavedChangesGuard],
          },
          {
            path: 'attributes-location',
            loadComponent: () => import('./details/attributes-location/attributes-location.component').then(m => m.AttributesLocationComponent),
            canDeactivate: [unsavedChangesGuard],
          },
          {
            path: 'location-media',
            loadComponent: () => import('./details/location-media/location-media.component').then(m => m.LocationMediaComponent),
          },
          {
            path: 'location-documents',
            loadComponent: () => import('./details/location-media/location-media.component').then(m => m.LocationMediaComponent),
            data: {documents: true},
          },
          {
            path: 'seating-layout-location',
            loadComponent: () => import('./details/seating-layout/seating-layout.component').then(m => m.SeatingLayoutComponent),
          },
        ],
      },
    ],
  }], overrides);
}
