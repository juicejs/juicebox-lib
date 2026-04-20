import {APP_INITIALIZER, ApplicationConfig, importProvidersFrom, inject, isDevMode} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Routes } from '@angular/router';
import {BASE_APP_CONFIG, BaseAppConfig, ModuleConfig} from './config/base-app.config';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
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

export function provideJuicebar(config: BaseAppConfig): ApplicationConfig {
  const routes = generateRoutes(config.modules, config.mainRoutes, config);

  return {
    providers: [
      provideHttpClient(),
      provideAnimations(),
      provideRouter(routes),
      importProvidersFrom(
        MatSidenavModule,
        MatToolbarModule,
        MatListModule,
        MatIconModule,
        MatButtonModule,
        MatCardModule,
        MatProgressSpinnerModule,
        MatFormFieldModule,
        MatInputModule,
        MatMenuModule,
        MatSnackBarModule,
        MatDialogModule,
        MatSelectModule,
        MatCheckboxModule,
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

  const config = inject(BASE_APP_CONFIG);

  // QC
  if (!isDevMode()) {
    juice.setEndPoint(window.location.protocol + '//' + window.location.host);
  } else {
    juice.setEndPoint('https://staging.quality-circle.com');
  }

  juiceboxService.setAuthenticator('juicebox:user');

  // switch (juice.getEndPoint()) {
  //     case 'http://localhost:3022' :
  //        juiceboxService.setAuthenticator('juicebox:user');
  //         break;
  //     case 'http://localhost:4001' :
  //         juiceboxService.setAuthenticator('juicebox:cse:user');
  //         break;
  //     case 'http://localhost:3024':
  //         juiceboxService.setAuthenticator('juicebox:csc:user');
  //         break;
  // }

  return async () => {
    juice.setEndPoint('https://staging.quality-circle.com');

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
      //canActivate:[AuthGuardService]
    },
    {
      path: 'main',
      component: MainComponent,
      children: mainChildren
    },
    ...modules.map(module => ({
      path: module.path,
      ...(module.component ? { loadComponent: module.component } : { loadChildren: module.loadChildren }),
      canActivate: module.guards || []
    }))
  ];

  return routes;
}
