import {Directive, ElementRef, Host, Input, OnInit, Optional, Self} from '@angular/core';
// import {NgSelectComponent} from '@ng-select/ng-select';
// import {UiSwitchComponent} from 'ngx-ui-switch';
// import {NgbDatepicker, NgbTimepicker} from '@ng-bootstrap/ng-bootstrap';
import {JuiceboxService} from '../services/Juicebox.service';

/**
 * Disables a component if there is no required permission
 * example: 'users:role#create' - checks for role users and permission create
 * example2: 'users:role#read' - checks only for role users
 *
 * Supported: NgbDatepicker, NgbTimepicker, NgSelectComponent, UiSwitchComponent, HtmlElement
 */
@Directive({selector: '[NoPermissionDisable]'})
export class NoPermissionDisableDirective implements OnInit {

    @Input() NoPermissionDisable: string;

    constructor(private el: ElementRef,
                private juicebox: JuiceboxService,
                // @Host() @Self() @Optional() private hostDatepickerComponent : NgbDatepicker,
                // @Host() @Self() @Optional() private hostTimepickerComponent : NgbTimepicker,
                // @Host() @Self() @Optional() private hostSelectComponent : NgSelectComponent,
                // @Host() @Self() @Optional() private hostSwitchComponent : UiSwitchComponent
    ) {
    }

    ngOnInit() {
        const input = this.NoPermissionDisable.split('#');
        const role = input[0];
        const permission = input[1];

        this.disableElement(this.hasPermission(role, permission));
    }

    disableElement(hasPermission: boolean) {
        if (hasPermission) return;

        // // ng-select
        // if (this.hostSelectComponent) {
        //     this.hostSelectComponent.setDisabledState(true);
        //     return;
        // }
        //
        // // ui-switch
        // if (this.hostSwitchComponent) {
        //     this.hostSwitchComponent.setDisabledState(true);
        //     return;
        // }
        //
        // // ngb-datepicker
        // if (this.hostDatepickerComponent) {
        //     this.hostDatepickerComponent.setDisabledState(true);
        //     return;
        // }
        //
        // // ngb-timepicker
        // if (this.hostTimepickerComponent) {
        //     this.hostTimepickerComponent.setDisabledState(true);
        //     return;
        // }

        // HtmlElement
        this.el.nativeElement.disabled = true;
        this.el.nativeElement.classList.add('cursor-disabled');
    }

    hasPermission(requiredRole: string, requiredPermission: string): boolean {
        if (!requiredRole || !requiredPermission) return false;
        const userRole = this.juicebox.getUser().roles.find(roleObject => roleObject.role === requiredRole);

        // "read" permission requires only the existence of a role for that permission to be true
        if (requiredPermission === 'read')
            return userRole;

        return userRole && userRole.permissions && userRole.permissions[requiredPermission];
    }
}
