import { Routes } from '@angular/router';
import { ComponentOverride } from '../../../config/base-app.config';
import { applyComponentOverrides } from '../../../config/route-customization';
import { UnsavedChangesGuard } from '../../shared/guards/unsaved-changes.guard';

export function buildUsersRoute(overrides?: ComponentOverride[]): Routes {
  return applyComponentOverrides([{
    path: 'users',
    loadComponent: () => import('./users.component').then(m => m.UsersComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./listing/user-listing.component').then(m => m.UserListingComponent),
      },
      {
        path: 'user-wizard',
        loadComponent: () => import('./user-wizard/user-wizard.component').then(m => m.UserWizardComponent),
        children: [
          { path: '', redirectTo: 'main', pathMatch: 'full' },
          {
            path: 'main',
            loadComponent: () => import('./user-wizard/main-wizard/main-wizard.component').then(m => m.MainWizardComponent),
          },
        ],
      },
      {
        path: 'details/:id',
        loadComponent: () => import('./details/details.component').then(m => m.DetailsUsersComponent),
        children: [
          { path: '', redirectTo: 'details-user', pathMatch: 'full' },
          {
            path: 'details-user',
            loadComponent: () => import('./details/details-user/details-user.component').then(m => m.DetailsUserComponent),
            canDeactivate: [UnsavedChangesGuard],
          },
          {
            path: 'documents-user',
            loadComponent: () => import('./details/documents-user/documents-user.component').then(m => m.DocumentsUserComponent),
          },
          {
            path: 'wallets-user',
            loadComponent: () => import('./details/wallets-user/wallets-user.component').then(m => m.WalletsUserComponent),
          },
          {
            path: 'roles-user',
            loadComponent: () => import('./details/roles-user/roles-user.component').then(m => m.RolesUserComponent),
          },
          {
            path: 'channels-user',
            loadComponent: () => import('./details/channels-user/channels-user.component').then(m => m.ChannelsUserComponent),
          },
          {
            path: 'groups-user',
            loadComponent: () => import('./details/groups-user/groups-user.component').then(m => m.GroupsUserComponent),
            canDeactivate: [UnsavedChangesGuard],
          },
          {
            path: 'sidebar-user',
            loadComponent: () => import('./details/sidebar-user/sidebar-user.component').then(m => m.SidebarUserComponent),
          },
          {
            path: 'organisations-user',
            loadComponent: () => import('./details/organisations-user/organisations-user.component').then(m => m.OrganisationsUserComponent),
          },
        ],
      },
    ],
  }], overrides);
}
