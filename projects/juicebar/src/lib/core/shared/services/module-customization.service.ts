import { Injectable, inject } from '@angular/core';
import { USERS_CUSTOMIZATION, EXPORTS_CUSTOMIZATION, ModuleCustomization } from '../../../config/base-app.config';

@Injectable({
  providedIn: 'root'
})
export class ModuleCustomizationService {
  private usersCustomization = inject(USERS_CUSTOMIZATION, { optional: true });
  private exportsCustomization = inject(EXPORTS_CUSTOMIZATION, { optional: true });

  // No-op for users — overrides are baked into the route config at startup via buildUsersRoute()
  applyComponentOverrides(_moduleName: 'users' | 'exports'): void {}

  isModuleEnabled(moduleName: 'users' | 'exports'): boolean {
    return this.getCustomization(moduleName) != null;
  }

  private getCustomization(moduleName: 'users' | 'exports'): ModuleCustomization | null | undefined {
    return moduleName === 'users' ? this.usersCustomization : this.exportsCustomization;
  }
}
