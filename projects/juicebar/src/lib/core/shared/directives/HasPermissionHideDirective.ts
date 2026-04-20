import {Directive, ElementRef, Input, OnInit} from '@angular/core';
import {JuiceboxService} from '../services/Juicebox.service';

@Directive({
    selector: `[hasPermissionsHide]`
})
export class HasPermissionHideDirective implements OnInit{

    @Input() hasPermissionsHide: string;

    constructor(private e: ElementRef,
                private juicebox: JuiceboxService) {

    }

    ngOnInit(): void {

        if (!this.hasPermissionsHide) return;

        // read permissions
        const role = this.hasPermissionsHide.split('#')[0];
        const permissions = this.hasPermissionsHide.split('#')[1];


        const hasRole = this.juicebox.getUser().roles.find(_role => {
            return _role.role == role;
        });

        if (hasRole && hasRole.permissions) {
            this.hasAllowedPermissions(permissions, hasRole.permissions);
        } else this.e.nativeElement.setAttribute("style", 'display:none');
    }

    hasAllowedPermissions(permissions: string, userPermissions: any) {
        if (!permissions?.length) return false;
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
        else this.e.nativeElement.setAttribute("style", 'display:none');

        return true;
    }
}
