import { EnvironmentProviders, inject, makeEnvironmentProviders, provideEnvironmentInitializer } from '@angular/core';
import { BASE_APP_CONFIG, BaseAppConfig, USERS_CUSTOMIZATION, EXPORTS_CUSTOMIZATION } from '../../../config/base-app.config';
import { SidebarService } from '../../shared/services/sidebar.service';
import { MainTranslationPipe } from './i18n/main.translation';

export function provideMain(): EnvironmentProviders {
  return makeEnvironmentProviders([
    MainTranslationPipe,
    provideEnvironmentInitializer(() => {
      const sidebarService = inject(SidebarService);
      const config = inject<BaseAppConfig>(BASE_APP_CONFIG, { optional: true });
      const usersCustomization = inject(USERS_CUSTOMIZATION, { optional: true });
      const exportsCustomization = inject(EXPORTS_CUSTOMIZATION, { optional: true });

      if (usersCustomization != null) {
        sidebarService.registerSidebarItem('users', 'users', 'users:role', 'fa-users', 'users');
      }

      if (exportsCustomization != null) {
        sidebarService.registerSidebarItem('exports', 'exports', 'exports:role', 'fa-table', 'exports');
      }

      if (config?.mainRoutes) {
        config.mainRoutes.forEach(moduleConfig => {
          if (moduleConfig.navigation) {
            sidebarService.registerSidebarItem(
              moduleConfig.path,
              moduleConfig.navigation.label,
              moduleConfig.navigation.role,
              moduleConfig.navigation.icon || 'fa-circle',
              moduleConfig.path
            );
          }
        });
      }
    }),
  ]);
}
