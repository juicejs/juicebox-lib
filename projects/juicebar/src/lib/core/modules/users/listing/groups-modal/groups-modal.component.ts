import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JuiceboxService } from '../../../../shared/services/Juicebox.service';
import { UsersService } from '../../users.service';
import { ConfigurationService } from '../../../../shared/services/configuration.service';
import { DialogRef } from '@angular/cdk/dialog';
import { UserTranslationPipe } from '../../i18n/user.translation';
import { GroupsNameEditorComponent } from './groups-name-editor.component/groups-name-editor.component';
import { ConfirmationDialogComponent } from '../../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../../../shared/shared.module';
import { DialogService, SnackbarService } from '../../../../../ui-components';

@Component({
    selector: 'groups-modal',
    templateUrl: './groups-modal.component.html',
    styleUrls: ['./groups-modal.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, FormsModule, SharedModule, UserTranslationPipe]
})
export class GroupsModalComponent implements OnInit {
    private juicebox = inject(JuiceboxService);
    private userService = inject(UsersService);
    private configurationService = inject(ConfigurationService);
    private dialogRef = inject(DialogRef<any>);
    private snackbar = inject(SnackbarService);
    private pipe = inject(UserTranslationPipe);
    private dialog = inject(DialogService);

    protected readonly groups = signal<Array<any>>([]);
    protected readonly roles = signal<Array<any>>([]);
    protected readonly rows = signal<Array<any>>([]);
    protected readonly selectedGroup = signal<any>(null);
    protected readonly selectedRole = signal<string | null>(null);
    protected readonly hasVisibilityFeature = signal<boolean>(false);

    protected readonly displayedColumns = computed(() =>
        this.hasVisibilityFeature()
            ? ['name', 'visibility', 'permissions', 'actions']
            : ['name', 'permissions', 'actions']
    );

    async ngOnInit() {
        this.hasVisibilityFeature.set(!!this.juicebox.getOptions().sidebarPermissions);
        await Promise.all([this.getGroups(), this.getRoles()]);
    }

    private async getGroups(): Promise<void> {
        const result = await this.userService.getAllGroups();
        if (!result.success) return;
        this.groups.set(result.payload);
    }

    private async getRoles(): Promise<void> {
        const [oldRoles, newRoles] = await Promise.all([
            this.configurationService.getBySchema('networking:user:role'),
            this.configurationService.getBySchema('user:role')
        ]);
        this.roles.set([...oldRoles.payload, ...newRoles.payload]);
    }

    createGroup() {
        const dialogRef = this.dialog.open(GroupsNameEditorComponent, { disableClose: true });
        dialogRef.closed.subscribe(async res => {
            if (!res?.success) return;
            await this.getGroups();
        });
    }

    updateSelectedGroup() {
        const dialogRef = this.dialog.open(GroupsNameEditorComponent, {
            disableClose: true,
            data: { group: this.selectedGroup() }
        });
        dialogRef.closed.subscribe(async res => {
            if (!res?.success) return;
            await this.getGroups();
        });
    }

    async groupChanged(group: any): Promise<void> {
        const result = await this.userService.getGroupById(group._id);
        if (!result?.success || !result.payload) return;

        this.selectedGroup.set(result.payload);
        this.rows.set(result.payload.roles);

        await this.refreshRoles(result.payload.roles);
    }

    async addRole(): Promise<void> {
        const role = this.selectedRole();
        const group = this.selectedGroup();
        if (!role || !group) return;

        const result = await this.userService.addRoleToGroup(group._id, role);
        if (!result.success) {
            this.snackbar.open(`Error: ${result.error}`, 'error');
            return;
        }

        this.snackbar.open(`Success: ${this.pipe.transform('successfully_added')} "${role}"`, 'success');
        this.selectedRole.set(null);
        this.selectedGroup.set(result.payload);
        this.rows.set(result.payload.roles);
        await this.refreshRoles(result.payload.roles);
    }

    deleteRole(role: any) {
        const dialogRef = this.dialog.open<ConfirmationDialogComponent, any, boolean>(ConfirmationDialogComponent, {
            disableClose: true,
            data: {
                subject: this.pipe.transform(role.role),
                action: this.pipe.transform('delete')
            }
        });
        dialogRef.closed.subscribe(async confirmed => {
            if (!confirmed) return;
            const result = await this.userService.deleteGroupRole(this.selectedGroup()._id, role);
            if (!result.success) {
                this.snackbar.open(`Error: ${result.error}`, 'error');
                return;
            }
            this.selectedGroup.set(result.payload);
            this.rows.set(result.payload.roles);
            await this.refreshRoles(result.payload.roles);
            this.snackbar.open(`Success: ${this.pipe.transform('successfully_deleted')}`, 'success');
        });
    }

    getRolePermissions(_role: any): Array<any> {
        const role = this.roles().find(r => r.key === _role.role);
        return role?.permissions ?? [];
    }

    async toggleVisibility(role: any, visible: boolean): Promise<void> {
        role.permissions['juicebox:visible'] = visible;
        await this.userService.updateGroupRolePermissions(this.selectedGroup()._id, role);
    }

    async updateGroupRolePermission(role: any): Promise<void> {
        const result = await this.userService.updateGroupRolePermissions(this.selectedGroup()._id, role);
        if (!result.success) {
            this.snackbar.open(`Error: ${result.error}`, 'error');
            const group = await this.userService.getGroupById(this.selectedGroup()._id);
            if (group?.success && group.payload) {
                this.rows.set(group.payload.roles);
            }
            return;
        }
        this.snackbar.open(`Success: ${this.pipe.transform('successfully_updated')}`, 'success');
    }

    close() {
        this.dialogRef.close({ success: false });
    }

    private async refreshRoles(userRoles: Array<any>): Promise<void> {
        const [oldRoles, newRoles] = await Promise.all([
            this.configurationService.getBySchema('networking:user:role'),
            this.configurationService.getBySchema('user:role')
        ]);
        const all = [...newRoles.payload, ...oldRoles.payload];
        this.roles.set(all.map(role => ({
            ...role,
            disabled: userRoles.some(_role => _role.role === role.key)
        })));
    }

    hasPermission(permission: string): boolean {
        return !!this.juicebox.hasPermission(permission);
    }
}
