import {Routes} from '@angular/router';
import {ComponentOverride} from '../../../config/base-app.config';
import {applyComponentOverrides} from '../../../config/route-customization';
import {tabPermissionGuard} from '../../shared/guards/tab-permission.guard';
import {unsavedChangesGuard} from '../../shared/guards/unsaved-changes.guard';

/**
 * The old juicebox communications routes (`main/communications/...`), so links to them keep working. The tabs are in
 * the old order, which is also the order a tab opened without its permission moves along (tabPermissionGuard).
 * `listing` marks a screen that is a table: the page puts it right under the tabs (CommunicationsComponent).
 */
export function buildCommunicationsRoute(overrides?: ComponentOverride[]): Routes {
  return applyComponentOverrides([{
    path: 'communications',
    loadComponent: () => import('./communications.component').then(m => m.CommunicationsComponent),
    children: [
      {path: '', redirectTo: 'send', pathMatch: 'full'},
      {
        path: 'contents',
        canActivate: [tabPermissionGuard],
        children: [
          {
            path: '',
            loadComponent: () => import('./contents/content-list/content-list.component').then(m => m.ContentListComponent),
            // The compact list next to an open record (the split view)
            data: {listingPane: true, listing: true},
          },
          {
            path: 'details/:id',
            data: {splitView: true},
            loadComponent: () => import('./contents/content-edit/content-edit.component').then(m => m.ContentEditComponent),
            // Leaving a content's page with unsaved changes asks first (CONTENTLEAVE)
            canDeactivate: [unsavedChangesGuard],
          },
        ],
      },
      {
        path: 'automation',
        canActivate: [tabPermissionGuard],
        children: [
          {
            path: '',
            loadComponent: () => import('./automation/automation-list/automation-list.component').then(m => m.AutomationListComponent),
            data: {listingPane: true, listing: true},
          },
          {
            path: 'details/:id',
            data: {splitView: true},
            loadComponent: () => import('./automation/automation-details/automation-details.component').then(m => m.AutomationDetailsComponent),
          },
          // The old address of an automation's details
          {path: 'details/:id/details-communication', redirectTo: 'details/:id'},
        ],
      },
      {
        path: 'send',
        canActivate: [tabPermissionGuard],
        loadComponent: () => import('./send/quick-send.component').then(m => m.QuickSendComponent),
      },
      {
        path: 'history',
        canActivate: [tabPermissionGuard],
        loadComponent: () => import('./history/history.component').then(m => m.HistoryComponent),
        data: {listing: true},
      },
    ],
  }], overrides);
}
