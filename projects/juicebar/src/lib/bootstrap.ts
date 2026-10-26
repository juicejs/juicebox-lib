import { APP_INITIALIZER, EnvironmentProviders, importProvidersFrom, isDevMode, makeEnvironmentProviders } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Routes } from '@angular/router';
import { BASE_APP_CONFIG, BaseAppConfig, JuicebarFeature, ModuleConfig } from './config/base-app.config';
import { DialogModule } from '@angular/cdk/dialog';
import { OverlayModule } from '@angular/cdk/overlay';
import { CdkTableModule } from '@angular/cdk/table';
import { CdkMenuModule } from '@angular/cdk/menu';
import { CdkListboxModule } from '@angular/cdk/listbox';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { DialogService, SnackbarService } from './ui-components';
import { LoginComponent } from './core/modules/main/login/login.component';
import { MainComponent } from './core/modules/main/main.component';
import { provideMain } from './core/modules/main/main.providers';
import { Juice } from './core/shared/services/juice.service';
import { JuiceboxService } from './core/shared/services/Juicebox.service';
import { AuthGuard } from './core/shared/guards/auth.guard';
import { UnsavedChangesGuard } from './core/shared/guards/unsaved-changes.guard';

export function provideJuicebar(config: BaseAppConfig, ...features: JuicebarFeature[]): EnvironmentProviders {
  const featureRoutes = features.flatMap(f => f.routes);
  const featureProviders = features.map(f => f.providers);

  return makeEnvironmentProviders([
    provideHttpClient(),
    provideAnimations(),
    {
      provide: BASE_APP_CONFIG,
      useValue: config,
    },
    provideRouter(generateRoutes(config.modules, config.mainRoutes, featureRoutes)),
    DialogService,
    SnackbarService,
    importProvidersFrom(
      DialogModule,
      OverlayModule,
      CdkTableModule,
      CdkMenuModule,
      CdkListboxModule,
      DragDropModule,
    ),
    provideMain(),
    ...featureProviders,
    {
      provide: APP_INITIALIZER,
      useFactory: JuiceboxProviderFactory,
      deps: [Juice, JuiceboxService, BASE_APP_CONFIG],
      multi: true,
    },
    AuthGuard,
    UnsavedChangesGuard,
    ...(config.providers || []),
  ]);
}

function generateRoutes(modules: ModuleConfig[], mainRoutes?: ModuleConfig[], featureRoutes: Routes = []): Routes {
  const userProfileRoute: Routes = [
    {
      path: 'user-profile',
      loadComponent: () =>
        import('./core/modules/main/navigation/user-profile/user-profile-tabs.component').then(
          m => m.UserProfileTabsComponent
        ),
      canDeactivate: [UnsavedChangesGuard],
      children: [
        { path: '', redirectTo: 'details', pathMatch: 'full' as const },
        {
          path: 'details',
          loadComponent: () =>
            import('./core/modules/main/navigation/user-profile/tabs/details/user-profile-details.component').then(
              m => m.UserProfileDetailsComponent
            ),
          canDeactivate: [UnsavedChangesGuard],
        },
        {
          path: 'sidebar',
          loadComponent: () =>
            import('./core/modules/main/navigation/user-profile/tabs/sidebar/user-profile-sidebar.component').then(
              m => m.UserProfileSidebarComponent
            ),
          canDeactivate: [UnsavedChangesGuard],
        },
      ],
    },
  ];

  const searchRoute: Routes = [
    {
      path: 'search',
      loadComponent: () =>
        import('./core/modules/main/search/search.component').then(m => m.SearchComponent),
    },
  ];

  const mainChildren = [
    // Plain /main stays empty; MainComponent then redirects to the first accessible module
    { path: '', pathMatch: 'full' as const, children: [] },
    ...userProfileRoute,
    ...searchRoute,
    ...featureRoutes,
    ...(mainRoutes?.map(m => ({
      path: m.path,
      ...(m.component ? { loadComponent: m.component } : { loadChildren: m.loadChildren }),
    })) ?? []),
    {
      path: 'not-found',
      loadComponent: () => import('./core/modules/main/not-found/not-found.component').then(m => m.NotFoundComponent),
    },
    { path: '**', redirectTo: 'not-found' },
  ];

  return [
    {
      path: 'login',
      component: LoginComponent,
    },
    {
      // Target of the link in the password reset email (`?token=`)
      path: 'reset-password',
      loadComponent: () =>
        import('./core/modules/main/login/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
    },
    {
      path: '',
      redirectTo: 'main',
      pathMatch: 'full' as const,
    },
    {
      path: 'main',
      component: MainComponent,
      canActivate: [AuthGuard],
      children: mainChildren,
    },
    ...modules.map(module => ({
      path: module.path,
      ...(module.component ? { loadComponent: module.component } : { loadChildren: module.loadChildren }),
      canActivate: module.guards || [AuthGuard],
    })),
    { path: '**', redirectTo: 'main/not-found' },
  ];
}

/**
 * Sets the API endpoint, then initialises the session.
 * - Development: `config.apiUrl` from provideJuicebar (default http://localhost:3000).
 * - Production: `config.json` next to index.html, written at deploy time:
 *   `{ "url": "https://api.example.com" | "auto", "authenticator"?: "..." }` ("auto" = same origin).
 */
export function JuiceboxProviderFactory(juice: Juice, juiceboxService: JuiceboxService, config: BaseAppConfig) {
  return async () => {
    if (config.authenticator) {
      juiceboxService.setAuthenticator(config.authenticator);
    }

    if (isDevMode()) {
      juice.setEndPoint(config.apiUrl || 'http://localhost:3000');
    } else {
      const runtimeConfig: any = await juice.loadConfiguration('config.json');
      if (runtimeConfig?.authenticator) {
        juiceboxService.setAuthenticator(runtimeConfig.authenticator);
      }
      const url = runtimeConfig?.url ?? 'auto';
      juice.setEndPoint(url === 'auto' ? window.location.protocol + '//' + window.location.host : url);
    }

    return juiceboxService.init();
  };
}
