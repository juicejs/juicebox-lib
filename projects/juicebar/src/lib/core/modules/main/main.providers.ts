import { EnvironmentProviders, inject, makeEnvironmentProviders, provideEnvironmentInitializer } from '@angular/core';
import { BASE_APP_CONFIG, BaseAppConfig, USERS_CUSTOMIZATION, EXPORTS_CUSTOMIZATION, LOCATIONS_CUSTOMIZATION, CATEGORIES_CUSTOMIZATION, COMMUNICATIONS_CUSTOMIZATION, CONFIGURATIONS_CUSTOMIZATION } from '../../../config/base-app.config';
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
      const locationsCustomization = inject(LOCATIONS_CUSTOMIZATION, { optional: true });
      const categoriesCustomization = inject(CATEGORIES_CUSTOMIZATION, { optional: true });
      const communicationsCustomization = inject(COMMUNICATIONS_CUSTOMIZATION, { optional: true });

      if (usersCustomization != null) {
        sidebarService.registerSidebarItem('users', 'users', 'users:role', 'fa-users', 'users');
      }

      if (exportsCustomization != null) {
        sidebarService.registerSidebarItem('exports', 'exports', 'data-export:role', 'fa-table', 'exports');
      }

      // As the old juicebox registered it: the label 'locations', the route 'location'
      if (locationsCustomization != null) {
        sidebarService.registerSidebarItem('location', 'locations', 'locations:role', 'fa-map-marker', 'location');
      }

      if (categoriesCustomization != null) {
        sidebarService.registerSidebarItem('categories', 'categories', 'categories:role', 'fa-th-list', 'categories');
      }

      if (communicationsCustomization != null) {
        sidebarService.registerSidebarItem('communications', 'communications', 'communication:role', 'fa-paper-plane', 'communications');
      }

      if (inject(CONFIGURATIONS_CUSTOMIZATION, { optional: true }) != null) {
        // The old juicebox's id and address, so staff's sidebar order and links keep working
        sidebarService.registerSidebarItem('configuration', 'configurations', 'configuration:role', 'fa-tools', 'configuration');
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
