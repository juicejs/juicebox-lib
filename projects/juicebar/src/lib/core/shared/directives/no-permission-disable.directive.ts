import { Directive, ElementRef, inject, input, OnInit } from '@angular/core';
import { JuiceboxService } from '../services/Juicebox.service';

/**
 * Disables a component if there is no required permission
 * example: 'users:role#create' - checks for role users and permission create
 * example2: 'users:role#read' - checks only for role users
 */
@Directive({ selector: '[NoPermissionDisable]' })
export class NoPermissionDisableDirective implements OnInit {
    private el = inject(ElementRef);
    private juicebox = inject(JuiceboxService);

    readonly NoPermissionDisable = input.required<string>();

    ngOnInit() {
        const input = this.NoPermissionDisable().split('#');
        const role = input[0];
        const permission = input[1];

        this.disableElement(this.hasPermission(role, permission));
    }

    disableElement(hasPermission: boolean) {
        if (hasPermission) return;
        this.el.nativeElement.disabled = true;
        this.el.nativeElement.classList.add('cursor-disabled');
    }

    hasPermission(requiredRole: string, requiredPermission: string): boolean {
        if (!requiredRole || !requiredPermission) return false;
        const userRole = this.juicebox.getUser().roles.find(roleObject => roleObject.role === requiredRole);

        if (requiredPermission === 'read') return !!userRole;

        return !!(userRole && userRole.permissions && userRole.permissions[requiredPermission]);
    }
}
