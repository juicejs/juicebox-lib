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

/** Project-specific behaviour of the users module */
export interface UsersOptions {
  /** Fields this project does not use; hidden in the create wizard, user details and the vendor dialog */
  hiddenFields?: Array<'nickname' | 'department'>;
  /** Fields that cannot be edited on user details */
  readonlyFields?: Array<'email'>;
  /** Hide the password section on user details */
  hidePassword?: boolean;
  /** Hide the organisations tab on user details */
  hideOrganisationsTab?: boolean;
  /** The create wizard picks the email from trainees without a user profile and links the trainee */
  createFromTrainees?: boolean;
}

export interface UsersCustomization extends ModuleCustomization {
  options?: UsersOptions;
}

export interface BaseAppConfig {
  /** API used in development (`ng serve`). Production reads `url` from config.json instead. */
  apiUrl: string;
  appName: string;
  /** Login authenticator, e.g. 'juicebox:cse:user'. A config.json `authenticator` overrides it in production. */
  authenticator?: string;
  /** Privacy policy link on the login legal agreement: a global translation key or a URL (default 'cse_privacy_policy_link') */
  privacyPolicyLink?: string;
  modules: ModuleConfig[];
  mainRoutes?: ModuleConfig[];
  providers?: (Provider | EnvironmentProviders)[];
}

export const BASE_APP_CONFIG = new InjectionToken<BaseAppConfig>('BASE_APP_CONFIG');
export const USERS_CUSTOMIZATION = new InjectionToken<UsersCustomization>('USERS_CUSTOMIZATION');
export const EXPORTS_CUSTOMIZATION = new InjectionToken<ModuleCustomization>('EXPORTS_CUSTOMIZATION');

export interface JuicebarFeature {
  routes: Routes;
  providers: EnvironmentProviders;
}
