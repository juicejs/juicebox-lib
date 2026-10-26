import { Directive, ElementRef, inject, input, OnInit } from '@angular/core';
import { JuiceboxService } from '../services/Juicebox.service';
import { DISABLEABLE } from '../../../ui-components';

@Directive({
  selector: `[hasPermissions]`
})
export class HasPermissionDirective implements OnInit {
  private e = inject(ElementRef);
  private juicebox = inject(JuiceboxService);
  /** Set when the host is an app-* control (app-button, app-checkbox) that manages its own `disabled` state. */
  private disableable = inject(DISABLEABLE, { self: true, optional: true });

  readonly hasPermissions = input<string>();

  /**
   * role#permission1,permission2,permission3 -> must have all permissions
   * role#permission1|permission2 -> must have one of the permissions
   */
  ngOnInit(): void {
    const value = this.hasPermissions();
    if (!value) return;

    const role = value.split('#')[0];
    const permissions = value.split('#')[1];

    const hasRole = this.juicebox.getUser().roles.find(_role => _role.role == role);

    if (hasRole && hasRole.permissions) {
      this.hasAllowedPermissions(permissions, hasRole.permissions);
    } else {
      this.setDisabled(true);
    }
  }

  hasAllowedPermissions(permissions: string, userPermissions: any) {
    if (!permissions || !permissions.length) return false;
    let separatedPermissions: any = [];
    let allow: boolean = true;

    //Case to have all permissions on directive
    if (permissions.includes(',')) {
      separatedPermissions = permissions.split(',');
      separatedPermissions.forEach(permission => {
        if (!userPermissions[permission] || userPermissions[permission] === false) allow = false;
      });
    } else if (permissions.includes('|')) { //Case to have only one permission listed
      separatedPermissions = permissions.split('|');
      allow = separatedPermissions.some(permission => !!userPermissions[permission]);
    } else if (!userPermissions[permissions] === true) { //Case if only one permission is selected
      allow = false;
    }

    this.setDisabled(!allow);

    return true;
  }

  private setDisabled(disabled: boolean) {
    if (this.disableable) {
      this.disableable.setExternallyDisabled(disabled);
      return;
    }

    if (disabled) {
      this.e.nativeElement.setAttribute("disabled", true);
      this.e.nativeElement.classList.add('cursor-disabled');
    } else {
      this.e.nativeElement.removeAttribute("disabled");
    }
  }
}
