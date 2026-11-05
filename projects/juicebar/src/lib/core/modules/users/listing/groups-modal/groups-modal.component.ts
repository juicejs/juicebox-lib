import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { JuiceboxService } from '../../../../shared/services/Juicebox.service';
import { UsersService } from '../../users.service';
import { ConfigurationService } from '../../../../shared/services/configuration.service';
import { DialogRef } from '@angular/cdk/dialog';
import { UserTranslationPipe } from '../../i18n/user.translation';
import { GroupsNameEditorComponent } from './groups-name-editor.component/groups-name-editor.component';
import { ConfirmationDialogComponent } from '../../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { FormsModule } from '@angular/forms';
import { SHARED_IMPORTS } from '../../../../shared/shared-imports';
import { DialogService } from '../../../../../ui-components';

@Component({
    selector: 'groups-modal',
    templateUrl: './groups-modal.component.html',
    styleUrl: './groups-modal.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, SHARED_IMPORTS, UserTranslationPipe]
})
export class GroupsModalComponent implements OnInit {
    private juicebox = inject(JuiceboxService);
    /** Permissions don't change within a session, so they're read once */
    protected readonly isGroupsSuperAdmin = !!this.juicebox.hasPermission('groups:role#super-admin');
    private userService = inject(UsersService);
    private configurationService = inject(ConfigurationService);
    private dialogRef = inject(DialogRef<any>);
    private pipe = inject(UserTranslationPipe);
    private dialog = inject(DialogService);

    protected readonly groups = signal<Array<any>>([]);
    protected readonly roles = signal<Array<any>>([]);
    /** The permissions each role offers, by role key */
    protected readonly rolePermissions = computed<Record<string, any[]>>(() =>
        Object.fromEntries(this.roles().map(role => [role.key, role.permissions ?? []])));
    protected readonly rows = signal<Array<any>>([]);
    protected readonly selectedGroup = signal<any>(null);
    protected readonly selectedRole = signal<string | null>(null);
    protected readonly hasVisibilityFeature = signal<boolean>(false);
    /** As in the old editor: Add and the role delete buttons show the running request (only the pressed one spins) */
    protected readonly promiseBtn = signal<Promise<unknown> | null>(null);

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
        const dialogRef = this.dialog.open(GroupsNameEditorComponent, { disableClose: true, closeOnEscape: false });
        dialogRef.closed.subscribe(async res => {
            if (!res?.success) return;
            await this.getGroups();
        });
    }

    updateSelectedGroup() {
        const dialogRef = this.dialog.open(GroupsNameEditorComponent, {
            disableClose: true, closeOnEscape: false,
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

    addRole(): void {
        const role = this.selectedRole();
        const group = this.selectedGroup();
        if (!role || !group) return;

        this.promiseBtn.set((async () => {
            const result = await this.userService.addRoleToGroup(group._id, role);
            if (!result.success) {
                this.juicebox.showToast('error', result.error);
                return;
            }

            this.juicebox.showToast('success', this.pipe.transform('success'), `${this.pipe.transform('successfully_added')} "${role}"`, { timeOut: 1000 });
            this.selectedRole.set(null);
            this.selectedGroup.set(result.payload);
            this.rows.set(result.payload.roles);
            await this.refreshRoles(result.payload.roles);
        })());
    }

    deleteRole(role: any) {
        const dialogRef = this.dialog.open<ConfirmationDialogComponent, any, boolean>(ConfirmationDialogComponent, {
            disableClose: true,
            data: {
                subject: this.pipe.transform(role.role),
                action: this.pipe.transform('delete'),
                destructive: true
            }
        });
        dialogRef.closed.subscribe(confirmed => {
            if (!confirmed) return;
            this.promiseBtn.set((async () => {
                const result = await this.userService.deleteGroupRole(this.selectedGroup()._id, role);
                if (!result.success) {
                    this.juicebox.showToast('error', result.error);
                    return;
                }
                this.selectedGroup.set(result.payload);
                this.rows.set(result.payload.roles);
                await this.refreshRoles(result.payload.roles);
                this.juicebox.showToast('success', this.pipe.transform('success'), this.pipe.transform('successfully_deleted'), { timeOut: 1000 });
            })());
        });
    }

    async toggleVisibility(role: any, visible: boolean): Promise<void> {
        role.permissions['juicebox:visible'] = visible;
        await this.userService.updateGroupRolePermissions(this.selectedGroup()._id, role);
    }

    async updateGroupRolePermission(role: any): Promise<void> {
        const result = await this.userService.updateGroupRolePermissions(this.selectedGroup()._id, role);
        if (!result.success) {
            this.juicebox.showToast('error', result.error);
            const group = await this.userService.getGroupById(this.selectedGroup()._id);
            if (group?.success && group.payload) {
                this.rows.set(group.payload.roles);
            }
            return;
        }
        this.juicebox.showToast('success', this.pipe.transform('success'), this.pipe.transform('successfully_updated'), { timeOut: 1000 });
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

}
