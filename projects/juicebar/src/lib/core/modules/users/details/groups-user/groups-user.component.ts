import { ListingComponent} from '../../../../shared/components/listing/listing.component';
import { Component } from '@angular/core';
import { UsersService } from '../../users.service';
import { ActivatedRoute } from '@angular/router';
import { UserTranslationPipe } from '../../i18n/user.translation';
import { GroupsModalComponent } from '../../listing/groups-modal/groups-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmationDialogComponent} from '../../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { JuiceboxService} from '../../../../shared/services/Juicebox.service';

@Component({
    selector: 'app-groups-user',
    styleUrls: ['./groups-user.component.css'],
    templateUrl: './groups-user.component.html'
})
export class GroupsUserComponent extends ListingComponent {

    selectedGroup: string;
    organisations: Array<any> = [];
    selectedOrganisation: string;
    groups: any;
    user: any = {
        groups: []
    };
    loading: boolean = true;

    promiseBtn: any;
    displayedColumns: string[] = ['name', 'roles', 'actions'];

    constructor(
        protected override juicebox: JuiceboxService,
        private userService: UsersService,
        public route: ActivatedRoute,
        public dialog: MatDialog,
        private snackBar: MatSnackBar,
        private pipe: UserTranslationPipe,
    ) {
        super(juicebox);
    }

  override async ngOnInit() {
        this.route.parent.params.subscribe(async (params): Promise<any> => {
            const result = await this.userService.getUser(params['id']);
            if (!result.success) {
                return false;
            }

            this.user = result.payload;
            if (!this.user.groups) {
                this.user.groups = [];
            }

            this.juicebox.navigationEvent({
                location: this.pipe.transform('users'),
                subject: this.user ? this.user.email : this.pipe.transform('groups'),
                link: '/main/users'
            });

            this.rows = await this.getUserGroups(params['id']);
        });
    }

    async getGroups() {
        const result = await this.userService.getAllGroups();
        if (!result.success) return false;

        return result.payload;
    }

    async getUserGroups(user_id: string, organisationId?: string): Promise<any> {
        this.loading = true;
        const groups = await this.getGroups();

        const result = await this.juicebox.getOrganisations(user_id);
        if (!result.payload || !result.payload.length) return false;

        this.organisations = result.payload;
        this.selectedOrganisation = organisationId ? organisationId : result.payload[0]._id;

        const userGroups = await this.userService.getUserGroups(user_id);
        this.loading = false;
        if (!userGroups.success || !groups || !userGroups.payload || !userGroups.payload.groups || !userGroups.payload.groups[this.selectedOrganisation]) {
            this.groups = groups || [];
            return [];
        }

        this.groups = groups.map(g => {
            const has = userGroups.payload.groups[this.selectedOrganisation].find(_g => {
                return _g.key === g.key;
            });
            g.disabled = !!has;
            return g;
        });
        return userGroups.payload.groups[this.selectedOrganisation];
    }

    async organisationChanged(organisation: any) {
        this.rows = [];
        this.rows = await this.getUserGroups(this.user._id, organisation._id);
    }

    getGroupRoles(group) {
        return group.roles.map(r => {
            return {
                role: r.role,
                permissions: Object.keys(r.permissions).filter(permissionKey => r.permissions[permissionKey]).join(', ')
            };
        });
    }

    async addGroup(): Promise<any> {
        let result: any = null;
        try {
            result = await this.userService.addGroupToUser(this.selectedGroup, this.user._id, this.selectedOrganisation);
            if (!result.success) {
                if (result.error) {
                    const translatedMessage: string = this.pipe.transform(result.error);
                    if (!translatedMessage.startsWith('@')) { // translation exists
                        this.snackBar.open(`${this.pipe.transform('error')}: ${translatedMessage}`, '', {
                        duration: 5000,
                        panelClass: ['error-snackbar']
                    });
                    };
                }

                return false;
            }

            this.snackBar.open(`${this.pipe.transform('success')}: ${this.pipe.transform('successfully_added')} ${this.selectedGroup}`, '', {
                duration: 3000,
                panelClass: ['success-snackbar']
            });
        } catch (error) {
            this.snackBar.open(`${this.pipe.transform('error')}: ${this.pipe.transform('error_adding_group_to_user')}`, '', {
                duration: 5000,
                panelClass: ['error-snackbar']
            });
        }

        this.rows = await this.getUserGroups(this.user._id, this.selectedOrganisation);
        this.selectedGroup = null;
    }

    async deleteGroup(group) {
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            disableClose: true,
            data: {
                subject: this.pipe.transform('group') + ": " + group.name,
                action: this.pipe.transform('remove')
            }
        });
        dialogRef.afterClosed().subscribe(async (dialogResult): Promise<any> => {
            if (!dialogResult) return;
            const result: any = await this.userService.deleteGroupFromUser(group.key, this.user._id, this.selectedOrganisation);
            if (!result.success) {
                this.snackBar.open(`${this.pipe.transform('error')}: ${result.error}`, '', {
                    duration: 5000,
                    panelClass: ['error-snackbar']
                });
                return false;
            }

            this.snackBar.open(`${this.pipe.transform('success')}: ${this.pipe.transform('successfully_deleted')} ${group.name}`, '', {
                duration: 3000,
                panelClass: ['success-snackbar']
            });
            this.rows = await this.getUserGroups(this.user._id, this.selectedOrganisation);
            this.selectedGroup = null;
        });

    }

    async openGroupEditor() {
        const dialogRef = this.dialog.open(GroupsModalComponent, {
            width: '1200px',
            maxWidth: '90vw',
            disableClose: true
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            this.rows = await this.getUserGroups(this.user._id);
        });
    }
}
