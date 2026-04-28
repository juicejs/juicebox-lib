import {APP_INITIALIZER, ApplicationConfig, importProvidersFrom, inject, isDevMode} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Routes } from '@angular/router';
import {BASE_APP_CONFIG, BaseAppConfig, ModuleConfig} from './config/base-app.config';
import { DialogModule } from '@angular/cdk/dialog';
import { OverlayModule } from '@angular/cdk/overlay';
import { CdkTableModule } from '@angular/cdk/table';
import { CdkMenuModule } from '@angular/cdk/menu';
import { CdkListboxModule } from '@angular/cdk/listbox';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { DialogService, SnackbarService } from './ui-components';
import {NavigationService} from './core/shared/services/NavigationService';
import {LoginComponent} from './core/modules/main/login/login.component';
import {MainComponentModule} from './core/modules/main/main.component.module';
import {MainComponent} from './core/modules/main/main.component';
import {Juice} from './core/shared/services/juice.service';
import {JuiceboxService} from './core/shared/services/Juicebox.service';
import {SidebarService} from './core/shared/services/sidebar.service';
import {UsersModule} from './core/modules/users/users.module';
import {UsersRoute} from './core/modules/users/users.route';
import {ExportsModule} from './core/modules/exports/exports.module';
import {ExportsRoute} from './core/modules/exports/exports.route';
import {Router} from '@angular/router';
import {ModuleCustomizationService} from './core/shared/services/module-customization.service';
import {AuthGuard} from './core/shared/guards/auth.guard';
import {environment} from "./environments/environment.development";

export function provideJuicebar(config: BaseAppConfig): ApplicationConfig {
  const routes = generateRoutes(config.modules, config.mainRoutes, config);

  return {
    providers: [
      provideHttpClient(),
      provideAnimations(),
      provideRouter(routes),
      DialogService,
      SnackbarService,
      importProvidersFrom(
        DialogModule,
        OverlayModule,
        CdkTableModule,
        CdkMenuModule,
        CdkListboxModule,
        DragDropModule,
        MainComponentModule,
        ...((!config.builtInModules?.users || config.builtInModules.users.enabled !== false) ? [UsersModule] : []),
        ...((!config.builtInModules?.exports || config.builtInModules.exports.enabled !== false) ? [ExportsModule] : [])
      ),
      {
        provide: BASE_APP_CONFIG,
        useValue: config
      },
      {
        provide: APP_INITIALIZER,
        useFactory: JuiceboxProviderFactory,
        deps: [Juice, JuiceboxService, SidebarService, Router],
        multi: true
      },
      {
        provide: APP_INITIALIZER,
        useFactory: ModuleCustomizationFactory,
        deps: [ModuleCustomizationService, Router],
        multi: true
      },
      AuthGuard,
      ...(config.providers || [])
    ]
  };
}

function addMenuItems(config: BaseAppConfig, navigationService: NavigationService): () => void {
  return () => {
    config.modules.forEach(module => {
      if (module.navigation) {
        navigationService.addMenuItem({
          label: module.navigation.label,
          route: module.path,
          icon: module.navigation.icon
        });
      }
    });
  };
}

export function JuiceboxProviderFactory(juice: Juice, juiceboxService: JuiceboxService, sidebarService: SidebarService, router: Router) {

  if (isDevMode()) juice.setEndPoint(environment.apiUrl);

  switch (juice.getEndPoint()) {
      case 'http://localhost:3022' :
         juiceboxService.setAuthenticator('juicebox:css:user');
          break;
      case 'http://localhost:4001' :
          juiceboxService.setAuthenticator('juicebox:cse:user');
          break;
      case 'http://localhost:3024':
          juiceboxService.setAuthenticator('juicebox:csc:user');
          break;
  }

  return async () => {
    if (!isDevMode()) {
      const config: any = await juice.loadConfiguration('config.json');

      if (config.authenticator)
          juiceboxService.setAuthenticator(config.authenticator);

      if ((<any>config).url === 'auto') {
          juice.setEndPoint(window.location.protocol + '//' + window.location.host);
      } else {
          juice.setEndPoint((<any>config).url);
      }
    }

    return await juiceboxService.init().then(async success => {
      console.log('Juicebox Initalized', success);
    });
  };

}

export function ModuleCustomizationFactory(
  customizationService: ModuleCustomizationService,
  router: Router
) {
  return async () => {
    // Wait for router to be ready
    await router.initialNavigation();

    // Apply customizations after router is fully initialized
    if (customizationService.isModuleEnabled('users')) {
      customizationService.applyComponentOverrides('users');
    }

    if (customizationService.isModuleEnabled('exports')) {
      customizationService.applyComponentOverrides('exports');
    }

    console.log('Module customizations applied');
  };
}

function generateRoutes(modules: ModuleConfig[], mainRoutes?: ModuleConfig[], config?: any): Routes {
  // Build children for main route - conditionally include built-in modules
  const mainChildren = [];

  // Add users module if enabled (default: true)
  if (!config?.builtInModules?.users || config.builtInModules.users.enabled !== false) {
    mainChildren.push(UsersRoute[0]);
  }

  // Add exports module if enabled (default: true)
  if (!config?.builtInModules?.exports || config.builtInModules.exports.enabled !== false) {
    mainChildren.push(ExportsRoute[0]);
  }

  // Add mainRoutes if provided
  if (mainRoutes) {
    mainChildren.push(...mainRoutes.map(moduleConfig => ({
      path: moduleConfig.path,
      loadChildren: moduleConfig.loadChildren
    })));
  }

  const routes = [
    {
      path: 'login',
      component: LoginComponent
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
      children: mainChildren
    },
    ...modules.map(module => ({
      path: module.path,
      ...(module.component ? { loadComponent: module.component } : { loadChildren: module.loadChildren }),
      canActivate: module.guards || [AuthGuard]
    }))
  ];

  return routes;
}
