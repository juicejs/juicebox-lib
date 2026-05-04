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
import { SidebarService } from './core/shared/services/sidebar.service';
import { Router } from '@angular/router';
import { AuthGuard } from './core/shared/guards/auth.guard';
import { environment } from './environments/environment.development';

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
      deps: [Juice, JuiceboxService, SidebarService, Router],
      multi: true,
    },
    AuthGuard,
    ...(config.providers || []),
  ]);
}

function generateRoutes(modules: ModuleConfig[], mainRoutes?: ModuleConfig[], featureRoutes: Routes = []): Routes {
  const detailsKids = featureRoutes[0]?.children?.[2]?.children ?? [];
  detailsKids.forEach((c: any) => console.log('[juicebar] details child:', c.path, '| loadComponent?', !!c.loadComponent, '| component?', !!c.component));
  const mainChildren = [
    ...featureRoutes,
    ...(mainRoutes?.map(m => ({
      path: m.path,
      ...(m.component ? { loadComponent: m.component } : { loadChildren: m.loadChildren }),
    })) ?? []),
  ];

  return [
    {
      path: 'login',
      component: LoginComponent,
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
  ];
}

export function JuiceboxProviderFactory(juice: Juice, juiceboxService: JuiceboxService, sidebarService: SidebarService, router: Router) {
  if (isDevMode()) juice.setEndPoint(environment.apiUrl);

  switch (juice.getEndPoint()) {
    case 'http://localhost:3022':
      juiceboxService.setAuthenticator('juicebox:css:user');
      break;
    case 'http://localhost:4001':
      juiceboxService.setAuthenticator('juicebox:cse:user');
      break;
    case 'http://localhost:3024':
      juiceboxService.setAuthenticator('juicebox:csc:user');
      break;
  }

  return async () => {
    const mainRoute = router.config.find(r => r.path === 'main');
    const usersRoute = mainRoute?.children?.find(r => r.path === 'users');
    const detailsRoute = usersRoute?.children?.find(r => r.path === 'details/:id');
    const groupsRoute = detailsRoute?.children?.find(r => r.path === 'groups-user');
    console.log('[juicebar] LIVE router groups-user route:', groupsRoute, 'loadComponent?', !!groupsRoute?.loadComponent, 'component?', !!groupsRoute?.component);

    if (!isDevMode()) {
      const config: any = await juice.loadConfiguration('config.json');

      if (config.authenticator) {
        juiceboxService.setAuthenticator(config.authenticator);
      }

      if (config.url === 'auto') {
        juice.setEndPoint(window.location.protocol + '//' + window.location.host);
      } else {
        juice.setEndPoint(config.url);
      }
    }

    return juiceboxService.init().then(success => {
      console.log('Juicebox Initialized', success);
    });
  };
}
