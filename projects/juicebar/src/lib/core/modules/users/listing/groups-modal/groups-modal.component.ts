import {Component, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ListingComponent} from '../../../../shared/components/listing/listing.component';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {UsersService} from '../../users.service';
import {ActivatedRoute} from '@angular/router';
import {ConfigurationService} from '../../../../shared/services/configuration.service';
import {DialogRef} from '@angular/cdk/dialog';
import {UserTranslationPipe} from '../../i18n/user.translation';
import {HelperService} from '../../../../shared/services/helper.service';
import {GroupsNameEditorComponent} from './groups-name-editor.component/groups-name-editor.component';
import {ConfirmationDialogComponent} from '../../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import {FormsModule} from '@angular/forms';
import {SharedModule} from '../../../../shared/shared.module';
import {DialogService, SnackbarService} from '../../../../../ui-components';

@Component({
    selector: 'groups-modal',
    templateUrl: './groups-modal.component.html',
    styleUrls: ['./groups-modal.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        FormsModule,
        SharedModule,
        UserTranslationPipe
    ]
})
export class GroupsModalComponent extends ListingComponent {

    selectedGroup: any = null;
    groups: Array<any> = [];

    selectedRole: any;
    roles: Array<any> = [];

    promiseBtn: any;
    enable: boolean = false;

    override columns = [
        { prop: 'role', name: 'Name' }
    ];
    count: any;

    hasVisibilityFeature: boolean = false;
    displayedColumns: string[] = ['name', 'permissions', 'actions'];

    constructor(protected override juicebox: JuiceboxService,
                private route: ActivatedRoute,
                private userService: UsersService,
                private configurationService: ConfigurationService,
                private dialogRef: DialogRef<any>,
                private snackbar: SnackbarService,
                private pipe: UserTranslationPipe,
                private helperService: HelperService,
                private dialog: DialogService) {
        super();

        this.hasVisibilityFeature = this.juicebox.getOptions().sidebarPermissions;
        if (this.hasVisibilityFeature) {
            this.displayedColumns = ['name', 'visibility', 'permissions', 'actions'];
        }
    }

  override async ngOnInit() {
        setTimeout(async t => {
            await this.getGroups();
            await this.getRoles();
        }, 100);
    }

    async getGroups(): Promise<any> {
        const result = await this.userService.getAllGroups();
        if (!result.success) return false;
        this.groups = result.payload;
    }

    async getRoles(): Promise<any> {
        const oldRoles = await this.configurationService.getBySchema('networking:user:role');
        const roles = await this.configurationService.getBySchema("user:role");
        this.roles = oldRoles.payload;
        this.roles = this.roles.concat(roles.payload);
        if (!this.roles) return false;
    }

    createGroup() {
        const dialogRef = this.dialog.open(GroupsNameEditorComponent, {
            disableClose: true
        });
        dialogRef.closed.subscribe(async (res) => {
            if (!res || !res.success)
                return;

            await this.getGroups();
        });
    }

    updateSelectedGroup() {
        const dialogRef = this.dialog.open(GroupsNameEditorComponent, {
            disableClose: true,
            data: { group: this.selectedGroup }
        });
        dialogRef.closed.subscribe(async (res) => {
            if (!res || !res.success)
                return;

            await this.getGroups();
        });
    }

    async groupChanged(group): Promise<any> {
        const groupId = group._id;
        const result = await this.userService.getGroupById(groupId);
        if (!result || !result.success || !result.payload) return false;

        this.selectedGroup = result.payload;
        this.rows = result.payload.roles;
        this.enable = result.payload.options && result.payload.options.superAdmin ? result.payload.options.superAdmin : false;

        const rolesResult = await this.configurationService.getBySchema('networking:user:role');
        const rolesNew = await this.configurationService.getBySchema("user:role");
        const roles = rolesNew.payload.concat(rolesResult.payload);
        if (!roles) return false;

        this.roles = roles.map(role => {
            let has = result.payload.roles.find(_role => {
                return _role.role == role.key;
            });
            role.disabled = !!has;
            return role;
        });
    }

    async addRole() {
        this.promiseBtn = (async (): Promise<any> => {
            const result = await this.userService.addRoleToGroup(this.selectedGroup._id, this.selectedRole);
            if (!result.success) {
                this.snackbar.open(`Error: ${result.error}`, 'error');
                return false;
            }

            this.snackbar.open(`Success: ${this.pipe.transform('successfully_added')} "${this.selectedRole}"`, 'success');
            this.selectedRole = null;
            this.selectedGroup = result.payload;
            this.rows = result.payload.roles;

            await this.refreshRoles(this.selectedGroup.roles);
        })();
    }

    async deleteRole(role) {
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            disableClose: true,
            data: {
                subject: this.pipe.transform(role.role),
                action: this.pipe.transform('delete')
            }
        });
        dialogRef.closed.subscribe(async (confirmed) => {
            if (!confirmed) return;
            this.promiseBtn = (async (): Promise<any> => {
                const result = await this.userService.deleteGroupRole(this.selectedGroup._id, role);
                if (!result.success) {
                    this.snackbar.open(`Error: ${result.error}`, 'error');
                    return false;
                }

                this.selectedGroup = result.payload;
                this.rows = result.payload.roles;

                await this.refreshRoles(this.selectedGroup.roles);
                this.snackbar.open(`Success: ${this.pipe.transform('successfully_deleted')}`, 'success');


            })()
        });
    }

    getRolePermissions(_role: any) {
        const role = this.roles.find(role => {
            return role.key == _role.role;
        });
        if (role && role.permissions) {
            return role.permissions;
        }

        return [];
    }

    async toggleVisibility(role: any, visible: boolean){
        role.permissions["juicebox:visible"] = visible;
        await this.userService.updateGroupRolePermissions(this.selectedGroup._id, role)
    }

    async updateGroupRolePermission(role): Promise<any> {
        const result = await this.userService.updateGroupRolePermissions(this.selectedGroup._id, role);
        if (!result.success) {
            this.rows = [];
            this.snackbar.open(`Error: ${result.error}`, 'error');
            const group = await this.userService.getGroupById(this.selectedGroup._id);
            if (!group || !group.success || !group.payload) return false;

            this.rows = group.payload.roles;
            return false;
        }
        this.snackbar.open(`Success: ${this.pipe.transform('successfully_updated')}`, 'success');
    }

    close() {
        this.dialogRef.close({ success: false });
    }

    async refreshRoles(userRoles: Array<any>) {
        const oldRoles = await this.configurationService.getBySchema('networking:user:role');
        let roles = await this.configurationService.getBySchema("user:role");
        roles = roles.payload.concat(oldRoles.payload);

        this.roles = roles.map(role => {
            let has = userRoles.find(_role => {
                return _role.role == role.key;
            });
            role.disabled = !!has;
            return role;
        });
    }
    // TODO implement unsavedChanges

    hasPermission(permission: string) {
        return this.juicebox.hasPermission(permission);
    }
}
