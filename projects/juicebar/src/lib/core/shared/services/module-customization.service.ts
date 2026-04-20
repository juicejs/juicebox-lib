import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BASE_APP_CONFIG, ComponentOverride } from '../../../config/base-app.config';

@Injectable({
  providedIn: 'root'
})
export class ModuleCustomizationService {
  private config = inject(BASE_APP_CONFIG);
  private router = inject(Router);

  /**
   * Apply component overrides to a module
   * @param moduleName - Name of the module ('users', 'exports')
   */
  applyComponentOverrides(moduleName: 'users' | 'exports'): void {
    const moduleConfig = this.config.builtInModules?.[moduleName];
    const overrides = moduleConfig?.customization?.componentOverrides;

    if (!overrides?.length) return;

    overrides.forEach(override => {
      console.log(`🔄 Overriding route [${override.routePath.join(' -> ')}] with custom component`);
      this.overwriteRoute(moduleName, override.routePath, override.component);
    });
  }

  /**
   * Override a specific route with a custom component
   */
  private overwriteRoute(moduleName: string, routePath: string[], component: any): void {
    console.log(`🔍 Looking for module: ${moduleName}`);
    console.log(`🔍 Route path to override:`, routePath);

    const moduleRouteConfig = this.router.config
      .find(item => item.path === 'main')?.children
      ?.find(route => route.path === moduleName);

    if (!moduleRouteConfig) {
      console.warn(`Module ${moduleName} not found in routes`);
      return;
    }

    console.log(`✅ Found module route config:`, moduleRouteConfig);

    const routeNodeToUpdate = routePath.reduce<any>((res, pathPart) => {
      console.log(`🔍 Looking for path part: ${pathPart} in:`, res.children?.map((c: any) => c.path));
      const routeNode = res.children?.find((node: any) => node.path === pathPart);

      if (!routeNode) {
        throw new Error(`Could not find route with path: ${pathPart}`);
      }

      console.log(`✅ Found route node:`, routeNode);
      return routeNode;
    }, moduleRouteConfig);

    console.log(`🔄 Replacing component for route:`, routeNodeToUpdate.path);
    routeNodeToUpdate.component = component;
    this.router.resetConfig(this.router.config);
    console.log(`✅ Component override complete`);
  }


  /**
   * Check if a module is enabled
   */
  isModuleEnabled(moduleName: 'users' | 'exports'): boolean {
    return this.config.builtInModules?.[moduleName]?.enabled !== false;
  }

  /**
   * Get custom providers for a module
   */
  getModuleProviders(moduleName: 'users' | 'exports'): any[] {
    return this.config.builtInModules?.[moduleName]?.customization?.providers || [];
  }
}