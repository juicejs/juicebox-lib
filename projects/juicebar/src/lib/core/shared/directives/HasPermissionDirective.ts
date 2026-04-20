import {Directive, ElementRef, Input, OnInit} from '@angular/core';
import {JuiceboxService} from '../services/Juicebox.service';

@Directive({
  selector: `[hasPermissions]`
})
export class HasPermissionDirective implements OnInit{

  @Input() hasPermissions: string;

  constructor(private e: ElementRef,
              private juicebox: JuiceboxService) {

  }

  /**
   * role#permission1,permission2,permission3 -> must have all permissions
   * role#permission1|permission2 -> must have one of the permissions
   */

  ngOnInit(): void {
    if (!this.hasPermissions) return;

    // read permissions
    const role = this.hasPermissions.split('#')[0];
    const permissions = this.hasPermissions.split('#')[1];

    const hasRole = this.juicebox.getUser().roles.find(_role => {
      return _role.role == role;
    });

    if (hasRole && hasRole.permissions) {
      this.hasAllowedPermissions(permissions, hasRole.permissions);
    } else {
      this.e.nativeElement.setAttribute("disabled", true);
      this.e.nativeElement.classList.add('cursor-disabled');
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
      })
    }

    //Case to have only one permission listed
    else if (permissions.includes('|')) {
      separatedPermissions = permissions.split('|');
      // @ts-ignore
      allow = separatedPermissions.find(permission => {
        if (userPermissions[permission] || userPermissions[permission] === true) {
          return true;
        }
      });
    }

    //Case if only one permission is selected
    else if (!userPermissions[permissions] === true) allow = false;


    if (allow) this.e.nativeElement.removeAttribute("disabled");
    else {
      this.e.nativeElement.setAttribute("disabled", true);
      this.e.nativeElement.classList.add('cursor-disabled');
    }

    return true;
  }
}
