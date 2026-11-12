import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {ConfigurationService} from '../services/configuration.service';
import {JuiceboxService} from '../services/Juicebox.service';
import {SidebarService} from '../services/sidebar.service';

interface RolePermission {
  key: string;
}

/**
 * The old juicebox TabPermissionsGuard: a module tab whose path is one of the permissions its role's configuration
 * declares (e.g. `communication:role` declares `send`, `contents`, …) needs that permission. Without it the page moves
 * to the first sibling tab the user has, in the order of the routes. The role is the one the module was registered
 * with in the sidebar, found by the module's route. A user with none of the tabs stays where they are (the old guard
 * redirected back and forth).
 */
export const tabPermissionGuard: CanActivateFn = async route => {
  const router = inject(Router);
  const juicebox = inject(JuiceboxService);
  const sidebar = inject(SidebarService);
  const configuration = inject(ConfigurationService);

  const path = route.routeConfig?.path;
  if (!path) return true;

  const modules = sidebar.getAllRegisteredSidebarItems();
  const roles = route.pathFromRoot
    .map(ancestor => modules.find(module => module.router === ancestor.routeConfig?.path)?.role)
    .filter((role): role is string => !!role);

  for (const role of roles) {
    const result = await configuration.getByKey(role);
    const declared: RolePermission[] = result?.payload?.permissions ?? [];
    if (!declared.some(permission => permission.key === path)) return true;
    if (juicebox.hasPermission(`${role}#${path}`)) continue;

    const granted: Record<string, unknown> = juicebox.getUser()?.roles?.find((r: {role: string}) => r.role === role)?.permissions ?? {};
    const siblings = route.parent?.routeConfig?.children ?? [];
    const next = siblings.find(sibling => sibling.path && granted[sibling.path] === true)
      ?? siblings.find(sibling => sibling.path && granted[sibling.path]);
    if (!next?.path) return false;

    const parentSegments = (route.parent?.pathFromRoot ?? []).flatMap(ancestor => ancestor.url.map(segment => segment.path));
    return router.createUrlTree(['/', ...parentSegments, next.path]);
  }
  return true;
};
