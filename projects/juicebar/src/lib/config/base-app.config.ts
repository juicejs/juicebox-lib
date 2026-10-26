import { Provider, EnvironmentProviders, Type, InjectionToken } from '@angular/core';
import { CanActivateFn, Routes } from '@angular/router';

export interface ModuleConfig {
  path: string;
  component?: () => Promise<Type<any>>;
  loadChildren?: () => Promise<any>;
  guards?: CanActivateFn[];
  navigation?: {
    role: string;
    label: string;
    icon?: string;
  };
}

export interface ComponentOverride {
  /**
   * Route path inside the module, one entry per route level, e.g. `['']` for the users listing or
   * `['details/:id', 'groups-user']` for a user details tab. An existing route gets this component;
   * a path that does not exist yet is added under its parent (e.g. a new tab or wizard step).
   */
  routePath: string[];
  component: Type<any>;
  /**
   * For an added route: show it as a tab on its parent page
   * (users: `['details/:id', …]` tabs and `['user-wizard', …]` wizard steps).
   */
  tab?: ComponentOverrideTab;
}

export interface ComponentOverrideTab {
  /** Translation key or plain text */
  label: string;
  /** Only show the tab when the user has this permission, e.g. `'customers:role#read'` */
  permission?: string;
  /** Only show the tab when the user has this role, e.g. `'pdf:role'` */
  role?: string;
}

export interface ModuleCustomization {
  componentOverrides?: ComponentOverride[];
  /** Extra providers for the module, e.g. services the override components need */
  providers?: Provider[];
}

export interface BaseAppConfig {
  apiUrl: string;
  appName: string;
  modules: ModuleConfig[];
  mainRoutes?: ModuleConfig[];
  providers?: (Provider | EnvironmentProviders)[];
}

export const BASE_APP_CONFIG = new InjectionToken<BaseAppConfig>('BASE_APP_CONFIG');
export const USERS_CUSTOMIZATION = new InjectionToken<ModuleCustomization>('USERS_CUSTOMIZATION');
export const EXPORTS_CUSTOMIZATION = new InjectionToken<ModuleCustomization>('EXPORTS_CUSTOMIZATION');

export interface JuicebarFeature {
  routes: Routes;
  providers: EnvironmentProviders;
}
