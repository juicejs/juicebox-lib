import { Directive, ElementRef, inject, input, OnInit } from '@angular/core';
import { JuiceboxService } from '../services/Juicebox.service';

@Directive({
    selector: `[hasPermissionsHide]`
})
export class HasPermissionHideDirective implements OnInit {
    private e = inject(ElementRef);
    private juicebox = inject(JuiceboxService);

    readonly hasPermissionsHide = input<string>();

    ngOnInit(): void {
        const value = this.hasPermissionsHide();
        if (!value) return;

        const role = value.split('#')[0];
        const permissions = value.split('#')[1];

        const hasRole = this.juicebox.getUser().roles.find(_role => _role.role == role);

        if (hasRole && hasRole.permissions) {
            this.hasAllowedPermissions(permissions, hasRole.permissions);
        } else {
            this.e.nativeElement.setAttribute("style", 'display:none');
        }
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
            });
        } else if (permissions.includes('|')) { //Case to have only one permission listed
             separatedPermissions = permissions.split('|');
            allow = !!separatedPermissions.find(permission => userPermissions[permission] === true);
        } else if (!userPermissions[permissions] === true) { //Case if only one permission is selected
            allow = false;
        }

        if (allow) this.e.nativeElement.removeAttribute("disabled");
        else this.e.nativeElement.setAttribute("style", 'display:none');

        return true;
    }
}
