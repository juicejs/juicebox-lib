import { Provider, EnvironmentProviders, Type, InjectionToken } from '@angular/core';
import { CanActivateFn, Routes } from '@angular/router';
import type { Observable } from 'rxjs';

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

/** Project-specific behaviour of the exports module */
export interface ExportsOptions {
  /**
   * Filters some users don't see, e.g. Quality Circle's mine-only users:
   * `{filter: 'show_modules', permission: 'modules:role#mine-only', unless: 'modules:role#super-admin'}`.
   * The filter keeps its value; it is only not shown.
   */
  hiddenFilters?: Array<{filter: string; permission: string; unless?: string}>;
  /** An export taking longer is cancelled with a message (Quality Circle: 90000); without it, a download waits */
  downloadTimeoutMs?: number;
}

export interface ExportsCustomization extends ModuleCustomization {
  options?: ExportsOptions;
}

/** Project-specific behaviour of the locations module */
export interface LocationsOptions {
  /** Details tabs this project does not use; they show by default */
  hiddenTabs?: Array<'attributes' | 'documents'>;
  /**
   * Fields beyond the standard ones, as Quality Circle has them: the location's email (stored as attributes.email),
   * accessibility, and coordinates entered by hand (used instead of looking up the address)
   */
  fields?: Array<'email' | 'accessibility' | 'coordinates'>;
  /** Shown under the email field, e.g. what it is used for (a translation key or text) */
  emailHint?: string;
  /** Longest short name the project accepts, e.g. 19 */
  shortNameMaxLength?: number;
  /** The listing's "Show locations" filter: all of them, the user's organisation's (mine) or the others' (public) */
  ownerFilter?: boolean;
  /** Location types (their `value`) that can be archived and unarchived from the listing; none by default */
  archivableTypes?: string[];
  /** Location types (their `value`) that can be deleted from the listing; `['region']` by default */
  deletableTypes?: string[];
}

export interface LocationsCustomization extends ModuleCustomization {
  options?: LocationsOptions;
}

/**
 * Project-specific behaviour of the categories module. As in the old juicebox, the backend's `juicecommerce:categories`
 * configuration also has a say: `allowDelete`, `allowRootDelete`, `showPublic` and `openCategoriesInNewTab`.
 */
export interface CategoriesOptions {
  /** The listing's "Show inactive" switch, as Quality Circle has it: the tree then also has the inactive categories */
  showInactive?: boolean;
  /** Ask before deactivating a category and tell what still uses it (Quality Circle's `category:usage:service`) */
  confirmDeactivation?: boolean;
  /** New subcategories are active unless switched off, as in Quality Circle; the old juicebox made them inactive */
  subcategoriesActive?: boolean;
}

export interface CategoriesCustomization extends ModuleCustomization {
  options?: CategoriesOptions;
}

/** The communications module has no options: its project parts are the backend configuration's */
export type CommunicationsCustomization = ModuleCustomization;

/** A project's look, like the old juicebox themes/<project> folder. Everything is optional: without it the admin is juice orange with the juice logo. */
export interface JuicebarTheme {
  /**
   * The brand colour as hex, like the old theme.scss `$primary` (e.g. '#243088'). Main buttons, the active sidebar item,
   * tabs, links, checkboxes and focus rings use shades of it, worked out for light and dark mode with readable text.
   */
  primary?: string;
  /** Logo in the sidebar and on the login page (a user's organisation logo still replaces it in the sidebar) */
  logo?: string;
  /** Picture behind the login card */
  loginImage?: string;
  /** Browser tab icon */
  favicon?: string;
}

/**
 * The numbers in the sidebar, by the module's sidebar id: 'users', 'exports', 'location', 'categories',
 * 'communications', or a project module's `path`. A module left out, or given null, shows no number.
 */
export type SidebarCounts = Record<string, number | null | undefined>;

/**
 * A project's answer to "which number stands next to each module in the sidebar". It gets the sidebar ids of the
 * modules the user sees and runs in an injection context, so it can `inject()` what it needs to call the project's API.
 */
export type GetSidebarCount = (moduleIds: readonly string[]) => SidebarCounts | Promise<SidebarCounts> | Observable<SidebarCounts>;

export interface SidebarCountConfig {
  getSidebarCount: GetSidebarCount;
  /**
   * When the numbers are read again after the sidebar loaded: after every page change ('navigation', the default),
   * or not at all ('load'); `SidebarService.refreshCounts()` reads them again either way.
   */
  refresh?: 'navigation' | 'load';
}

export interface BaseAppConfig {
  /** API used in development (`ng serve`). Production reads `url` from config.json instead. */
  apiUrl: string;
  appName: string;
  /** Login authenticator, e.g. 'juicebox:cse:user'. A config.json `authenticator` overrides it in production. */
  authenticator?: string;
  /** Privacy policy link on the login legal agreement: a global translation key or a URL (default 'cse_privacy_policy_link') */
  privacyPolicyLink?: string;
  /**
   * Language of the login page, and after login when neither the user, the project (`default_language`) nor the
   * browser gives one; like `login_language` in the old juicebox setup.json (default 'de_DE')
   */
  loginLanguage?: string;
  /** Colours, logo, login picture and favicon of this project */
  theme?: JuicebarTheme;
  /** A number next to the modules' names in the sidebar, answered by the project; without it the sidebar shows none */
  sidebarCount?: SidebarCountConfig;
  modules: ModuleConfig[];
  mainRoutes?: ModuleConfig[];
  providers?: (Provider | EnvironmentProviders)[];
}

export const BASE_APP_CONFIG = new InjectionToken<BaseAppConfig>('BASE_APP_CONFIG');
export const USERS_CUSTOMIZATION = new InjectionToken<UsersCustomization>('USERS_CUSTOMIZATION');
export const EXPORTS_CUSTOMIZATION = new InjectionToken<ExportsCustomization>('EXPORTS_CUSTOMIZATION');
export const LOCATIONS_CUSTOMIZATION = new InjectionToken<LocationsCustomization>('LOCATIONS_CUSTOMIZATION');
export const CATEGORIES_CUSTOMIZATION = new InjectionToken<CategoriesCustomization>('CATEGORIES_CUSTOMIZATION');
export const COMMUNICATIONS_CUSTOMIZATION = new InjectionToken<CommunicationsCustomization>('COMMUNICATIONS_CUSTOMIZATION');

/** The configurations module has no options of its own yet */
export type ConfigurationsCustomization = ModuleCustomization;

export const CONFIGURATIONS_CUSTOMIZATION = new InjectionToken<ConfigurationsCustomization>('CONFIGURATIONS_CUSTOMIZATION');

export interface JuicebarFeature {
  routes: Routes;
  providers: EnvironmentProviders;
}
