import {Provider, EnvironmentProviders, Type, InjectionToken} from '@angular/core';
import { CanActivateFn } from '@angular/router';

export interface ModuleConfig {
  path: string;
  component?: () => Promise<Type<any>>; // Optional for standalone components
  loadChildren?: () => Promise<any>;     // Optional for modules
  guards?: CanActivateFn[];
  navigation?: {
    role: string;
    label: string;
    icon?: string;
  };
}

// Component override configuration
export interface ComponentOverride {
  routePath: string[];  // e.g., ['details/:id', 'groups-user']
  component: Type<any>; // Your custom component
}

// Module customization options
export interface ModuleCustomization {
  // Component overrides for specific routes
  componentOverrides?: ComponentOverride[];

  // Custom providers for the module
  providers?: Provider[];
}

// Built-in module configuration
export interface BuiltInModules {
  users?: {
    enabled: boolean;
    customization?: ModuleCustomization;
  };
  exports?: {
    enabled: boolean;
    customization?: ModuleCustomization;
  };
}

export interface BaseAppConfig {
  apiUrl: string;
  appName: string;
  production: boolean;
  modules: ModuleConfig[];
  mainRoutes?: ModuleConfig[];
  providers?: (Provider | EnvironmentProviders)[];
  stage?: string;

  // Control over built-in modules
  builtInModules?: BuiltInModules;
}

// Add this export
export const BASE_APP_CONFIG = new InjectionToken<BaseAppConfig>('BASE_APP_CONFIG');
