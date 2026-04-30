import {Component, inject, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ActivatedRoute} from '@angular/router';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {ConfigurationService} from '../../../../shared/services/configuration.service';
import {UsersService} from '../../users.service';
import {UserTranslationPipe} from '../../i18n/user.translation';
import {DialogService} from '../../../../../ui-components';
import {ConfirmationDialogComponent} from '../../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import {HelperService} from '../../../../shared/services/helper.service';
import {FormsModule} from '@angular/forms';
import {SharedModule} from '../../../../shared/shared.module';

@Component({
    selector: 'app-roles-user',
    styleUrls: ['./roles-user.component.css'],
    templateUrl: './roles-user.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        FormsModule,
        SharedModule,
        UserTranslationPipe
    ]
})
export class RolesUserComponent implements OnInit {

    public userId: string;
    public user: any;
    public rows = [];
    public userHasGroups: boolean;

    public selectedRole: string;
    public availableRoles = [];
    public allRoles = [];

    public selectedOrganisation: string;
    public organisations = [];

    i18n: UserTranslationPipe;
    public promiseBtn;

    public juiceboxOptions: any;

    public hasVisibilityFeature: boolean = false;
    displayedColumns: string[] = ['name', 'permissions', 'actions'];

    private configurationService = inject(ConfigurationService);
    protected juicebox = inject(JuiceboxService);
    private userService = inject(UsersService);
    private dialog = inject(DialogService);
    public route = inject(ActivatedRoute);
    public helperService = inject(HelperService);

    constructor() {
        this.i18n = new UserTranslationPipe(this.juicebox);
    }

    async ngOnInit() {
        this.userId = this.route.snapshot.parent.params['id'];
        this.selectedOrganisation = this.juicebox.getUserOrganisationId();
        await this.getOrganisations();
        await this.getUserData();

        this.hasVisibilityFeature = this.juicebox.getOptions().sidebarPermissions;
        if (this.hasVisibilityFeature) {
            this.displayedColumns = ['name', 'visibility', 'permissions', 'actions'];
        }
    }

    async getUserData() {
        await this.getUser();
        await this.getUserRoles();
        await this.getAvailableRoles();

        this.juicebox.navigationEvent({
            location: this.i18n.transform('users'),
            subject: this.user ? this.user.email + ' - ' + this.i18n.transform('roles') : 'details',
            link: '/main/users'
        });
    }

    private async getOrganisations(): Promise<any> {
        const organisationResult = await this.juicebox.getOrganisations(this.userId);
        if (!organisationResult.payload || !organisationResult.payload.length) return false;

        this.organisations = organisationResult.payload;
    }

    private async getUser() {
        const result = await this.userService.getUser(this.userId);
        if (!result.success) {
            this.juicebox.showToast("error", 'Error fetching User');
        }

        this.user = result.payload;
        if (!this.user.roles) this.user.roles = [];
        this.userHasGroups = this._userHasGroups();
    }

    private async getUserRoles() {
        this.user.roles = this.user.roles[this.selectedOrganisation] ? this.user.roles[this.selectedOrganisation] : [];
        this.rows = [...(this.user.roles.sort((a,b) => {
            if (a.role < b.role) {
                return -1;
            }
            if (a.role > b.role) {
                return 1;
            }
            return 0;
        }))];
    }

    private async getAvailableRoles(): Promise<any> {
        const oldRoles = await this.configurationService.getBySchema('networking:user:role');
        const roles = await this.configurationService.getBySchema("user:role");
        this.allRoles = oldRoles.payload;
        this.allRoles = this.allRoles.concat(roles.payload);
        if (!this.allRoles) return false;

        this.availableRoles = this.allRoles.map(role => {
            let has = this.user.roles.find(_role => {
                return _role.role == role.key;
            });
            role.disabled = !!has;
            return role;
        }).sort((a: any, b: any) => a.name.localeCompare(b.name));
    }

    private _userHasGroups(): boolean {
        if (!this.user || !this.user.groups) return false;

        const hasGroups = Object.values(this.user.groups).find(group => (group && (<any>group).length));
        return !!hasGroups;
    }

    addRole() {
        this.promiseBtn = (async () => {
            if (!this.selectedRole) return Promise.resolve();

            const newRole = {
                role: this.selectedRole,
                permissions: {},
                index: this.user.roles.filter(role => role.hasOwnProperty('index')).length + 1
            }

            const newRoles = [...this.user.roles, newRole];

            const result = await this.userService.updateRoles(this.user._id, newRoles, this.selectedOrganisation);
            if (result && result.success) {
                this.juicebox.showToast("success", this.i18n.transform('role_added'))
                this.selectedRole = null;
                await this.getUserData();
            } else {
                this.juicebox.showToast("error", this.i18n.transform('role_add_failed'))
            }
        })();
    }

    async addSingleRole() {
        this.promiseBtn = (async (): Promise<any> => {
            if (!this.selectedRole) {
                this.juicebox.showToast("error", "Error", this.i18n.transform('select_role_first'));
                return await this.helperService.pause();
            }
            const result = await this.userService.addRole(this.user._id, this.selectedRole, this.selectedOrganisation);
            if (!result || !result.success) {
                this.juicebox.showToast("error", "Error", this.i18n.transform('role_add_failed'));
                await this.helperService.pause();
                return;
            }

            this.juicebox.showToast("success", "Success", this.i18n.transform('role_added'), { timeOut: 1000 });
            this.selectedRole = null;
            await this.getUserData();
        })()
    }

    removeRole(role: { role: string, permissions: { [key: string]: boolean } }) {
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            disableClose: true,
            data: {
                subject: this.i18n.transform(role.role),
                action: this.i18n.transform('remove_role')
            }
        });
        dialogRef.closed.subscribe(async (result) => {
            if (!result) return;
            const deleteResult = await this.userService.removeRole(this.user._id, role.role, this.selectedOrganisation);
            if (!deleteResult || !deleteResult.success) {
                this.juicebox.showToast("error", "Error", this.i18n.transform('role_delete_failed'));
                return;
            }

            this.juicebox.showToast("success", "Success", this.i18n.transform('role_deleted'), { timeOut: 1000 })
            await this.getUserData();
        });
    }

    getRolePermissions(_role: any) {
        const role = this.allRoles.find(role => {
            return role.key === _role.role;
        });
        if (role && role.permissions) return role.permissions;

        return [];
    }

    async toggleVisibility(role: string, visible: boolean, permissions: { [key: string]: boolean }){
        permissions["juicebox:visible"] = visible;
        const result = await this.userService.updatePermissions(this.user._id, role, permissions, this.selectedOrganisation);
    }

    async togglePermission(role: string, permissions: { [key: string]: boolean }) {
        const result = await this.userService.updatePermissions(this.user._id, role, permissions, this.selectedOrganisation);
        if (!result || !result.success) {
            this.juicebox.showToast("error", "Error", this.i18n.transform('permission_update_failed'));
            return;
        }

        this.juicebox.showToast("success", "Success", "", { timeout: 500 });
    }

    async organisationChanged(event) {
        this.selectedOrganisation = event;
        await this.getUserData();
    }
}
