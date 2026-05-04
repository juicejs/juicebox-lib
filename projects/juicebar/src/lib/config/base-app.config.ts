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
  routePath: string[];
  component: Type<any>;
}

export interface ModuleCustomization {
  componentOverrides?: ComponentOverride[];
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
