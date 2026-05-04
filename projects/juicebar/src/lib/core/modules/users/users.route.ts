import { Type } from '@angular/core';
import { Routes } from '@angular/router';
import { ComponentOverride } from '../../../config/base-app.config';

function resolveComponent(
  defaultLoader: () => Promise<Type<any>>,
  overridePath: string[],
  overrides?: ComponentOverride[]
): () => Promise<Type<any>> {
  const override = overrides?.find(o => o.routePath.join('/') === overridePath.join('/'));
  if (override) {
    console.log('[juicebar] Component override applied for route:', overridePath.join('/'), '→', override.component);
    const overrideComponent = override.component;
    return () => {
      console.log('[juicebar] loadComponent called for override:', overridePath.join('/'), overrideComponent);
      return Promise.resolve(overrideComponent);
    };
  }
  console.log('[juicebar] No override for route:', overridePath.join('/'), '— using default loader');
  return defaultLoader;
}

export function buildUsersRoute(overrides?: ComponentOverride[]): Routes {
  console.log('[juicebar] buildUsersRoute called with overrides:', overrides);
  const r = (path: string[], loader: () => Promise<Type<any>>) =>
    resolveComponent(loader, path, overrides);

  return [{
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
            loadComponent: r(['user-wizard', 'main'], () => import('./user-wizard/main-wizard/main-wizard.component').then(m => m.MainWizardComponent)),
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
            loadComponent: r(['details/:id', 'details-user'], () => import('./details/details-user/details-user.component').then(m => m.DetailsUserComponent)),
          },
          {
            path: 'documents-user',
            loadComponent: r(['details/:id', 'documents-user'], () => import('./details/documents-user/documents-user.component').then(m => m.DocumentsUserComponent)),
          },
          {
            path: 'wallets-user',
            loadComponent: r(['details/:id', 'wallets-user'], () => import('./details/wallets-user/wallets-user.component').then(m => m.WalletsUserComponent)),
          },
          {
            path: 'roles-user',
            loadComponent: r(['details/:id', 'roles-user'], () => import('./details/roles-user/roles-user.component').then(m => m.RolesUserComponent)),
          },
          {
            path: 'channels-user',
            loadComponent: r(['details/:id', 'channels-user'], () => import('./details/channels-user/channels-user.component').then(m => m.ChannelsUserComponent)),
          },
          {
            path: 'groups-user',
            loadComponent: r(['details/:id', 'groups-user'], () => import('./details/groups-user/groups-user.component').then(m => m.GroupsUserComponent)),
          },
          {
            path: 'sidebar-user',
            loadComponent: r(['details/:id', 'sidebar-user'], () => import('./details/sidebar-user/sidebar-user.component').then(m => m.SidebarUserComponent)),
          },
          {
            path: 'organisations-user',
            loadComponent: r(['details/:id', 'organisations-user'], () => import('./details/organisations-user/organisations-user.component').then(m => m.OrganisationsUserComponent)),
          },
        ],
      },
    ],
  }];
}
