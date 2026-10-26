import { Route, Routes } from '@angular/router';
import { ComponentOverride } from './base-app.config';

/** What a module needs to decide whether a custom tab is visible (JuiceboxService fits). */
export interface TabPermissionChecker {
  hasPermission(permission: string): boolean | void;
  hasRole(role: string): boolean;
}

export interface CustomTab {
  /** Route path of the tab, relative to its parent page */
  route: string;
  /** Translation key or plain text */
  label: string;
}

/**
 * Applies `componentOverrides` to a module's routes. The module has a single root route
 * (e.g. `users`) and `routePath` is resolved from its children:
 * - an existing path gets the override component (guards and child routes stay as they are);
 * - a missing last segment is added as a new route under its parent (new tabs, wizard steps).
 */
export function applyComponentOverrides(moduleRoutes: Routes, overrides: ComponentOverride[] = []): Routes {
  const routes = cloneRoutes(moduleRoutes);
  const [moduleRoot] = routes;

  for (const override of overrides) {
    const parentPath = override.routePath.slice(0, -1);
    const path = override.routePath[override.routePath.length - 1];
    const parent = parentPath.reduce<Route | undefined>((route, segment) =>
      route?.children?.find(child => child.path === segment), moduleRoot);

    if (!parent) {
      throw new Error(`componentOverrides: no route '${parentPath.join('/')}' in '${moduleRoot.path}'`);
    }

    const component = override.component;
    const existing = parent.children?.find(child => child.path === path && !child.redirectTo);
    if (existing) {
      delete existing.component;
      existing.loadComponent = () => Promise.resolve(component);
    } else {
      parent.children = [...(parent.children ?? []), { path, component }];
    }
  }

  return routes;
}

/** Tabs that `componentOverrides` add under `parentPath` and the current user may see. */
export function getCustomTabs(
  overrides: ComponentOverride[] | undefined,
  parentPath: string[],
  checker: TabPermissionChecker
): CustomTab[] {
  const parent = parentPath.join('/');
  return (overrides ?? [])
    .filter(override => override.tab && override.routePath.slice(0, -1).join('/') === parent)
    .filter(({ tab }) =>
      (!tab.permission || !!checker.hasPermission(tab.permission)) && (!tab.role || checker.hasRole(tab.role)))
    .map(({ routePath, tab }) => ({ route: routePath[routePath.length - 1], label: tab.label }));
}

function cloneRoutes(routes: Routes): Routes {
  return routes.map(route => ({
    ...route,
    ...(route.children ? { children: cloneRoutes(route.children) } : {})
  }));
}
