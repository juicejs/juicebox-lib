import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { UsersService } from '../users.service';
import { ListingComponent } from '../../../shared/components/listing/listing.component';
import { Router, RouterLink } from '@angular/router';
import { UserTranslationPipe } from '../i18n/user.translation';
import { DialogService, PageEvent } from '../../../../ui-components';
import { GroupsModalComponent } from './groups-modal/groups-modal.component';
import { HelperService} from '../../../shared/services/helper.service';
import { ISearchTerm} from '../../../shared/interfaces/ISearchTerm';
import { ISort} from '../../../shared/interfaces/ISort';
import { ConfigurationService} from '../../../shared/services/configuration.service';
import { ConfirmationDialogComponent} from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { JuiceboxService} from '../../../shared/services/Juicebox.service';
import { ActionButton} from '../../../shared/types/ActionButton';
import { User } from '../models/user.model';
import { LoginAsAnotherUserComponent } from './login-as-another-user/login-as-another-user.component';
import { FilterConfig, FilterBarComponent } from '../../../shared/components/filter-bar/filter-bar.component';
import {CommonModule} from '@angular/common';
import {SharedModule} from '../../../shared/shared.module';
import {AutoLanguagePipe} from '../../../shared/pipes/auto-language.pipe';

export interface Sort {
    active: string;
    direction: 'asc' | 'desc' | '';
}

@Component({
    selector: 'app-ng-table',
    styleUrls: ['./user-listing.component.scss'],
    templateUrl: './user-listing.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        RouterLink,
        FilterBarComponent,
        SharedModule,
        UserTranslationPipe,
        AutoLanguagePipe
    ]
})
export class UserListingComponent extends ListingComponent implements OnInit {

    sort: ISort = { dir: 'asc', prop: 'lastname' }; // setting initial sort
    filter: Array<ISearchTerm> = [];
    i18n: UserTranslationPipe;
    count: number;
    loggedInOrganisationId: string;
    projectTitle: string;

    organisations: Array<any> = [];
    organisationsCount: number = 0;
    sortOrganisations: ISort = { dir: 'asc', prop: 'name' };
    filterOrganisations: Array<ISearchTerm> = [];
    pageOrganisations: number = 0;

    groups: Array<any> = [];
    filteredGroups: Array<any> = [];

    roles: Array<any> = [];
    filteredRoles: Array<any> = [];
    objectValues = Object.values;

    // Selected filter values for filter buttons
    selectedOrganisation: any = null;
    selectedRole: any = null;
    selectedGroup: any = null;

    // Filter configurations for reusable filter component
    filterConfigs: FilterConfig[] = [];

    actionButtons: Array<ActionButton> = [];
    displayedColumns: string[] = ['firstname', 'lastname', 'email', 'active', 'roles_count', 'groups', 'lastLogin', 'loginCount', 'actions'];

    public constructor(public usersService: UsersService,
                       public override juicebox: JuiceboxService,
                       public helper: HelperService,
                       private router: Router,
                       private dialog: DialogService,
                       private configurationService: ConfigurationService,
                       private cdr: ChangeDetectorRef) {
        super(juicebox);

    }

    public override async ngOnInit(): Promise<void> {
        this.projectTitle = this.juicebox.getProjectTitle();
        this.i18n = new UserTranslationPipe(this.juicebox);

        this.juicebox.navigationEvent({
            location: this.i18n.transform('users'),
            subject: this.i18n.transform('user_list'),
            link: 'main/users'
        });

        const actionButtons = [{
            title: this.i18n.transform("add_new"),
            type: "btn-primary",
            icon: "fa-plus-circle",
            permissions: "users:role#create",
            routerLink: "user-wizard",
            callback: () => { this.router.navigate(["/main/users/user-wizard"]) }
        }, {
            title: this.i18n.transform("groups"),
            type: "btn-primary",
            icon: "fa-plus-circle",
            permissions: "groups:role#read",
            routerLink: "user-wizard",
            callback: () => { this.openGroupsModal() }
        }];

        const excludeCreateVendorButton = ['CSJuicEcommerce', 'CSWP', 'Kromer', 'Carl Stahl Configurator', 'FireCircle', 'QualityCircle'];
        const excludeCreateUserFromTraineeButton = ['QualityCircle'];
        for (const button of this.usersService.customActionButtons) {
            if (excludeCreateVendorButton.includes(this.projectTitle) && (button.title === 'Create vendor' || button.title == 'Verkäufer anlegen'))
                continue;

            if (excludeCreateUserFromTraineeButton.includes(this.projectTitle)
                && button.title === 'Create user from Trainee' || button.title === 'Person als Benutzer anlegen') continue;

            if (button.title === 'Create vendor' || button.title === 'Verkäufer anlegen') {
                button.type = 'btn-primary';
            }

            actionButtons.push(button);
        }
        this.juicebox.setActionButtons(actionButtons);

        this.loggedInOrganisationId = this.juicebox.getUser().organisation_id;

        await this.fetchUsers();
        await this.getOrganisations();
        await this.fetchRoles();
        await this.fetchGroups();

        // Initialize filter configurations
        this.initializeFilterConfigs();
    }

    private async fetchUsers(): Promise<any> {
        const result = await this.usersService.fetch(this.loggedInOrganisationId, this.page - 1, this.itemsPerPage, this.sort, this.filter);
        if (!result.success)
            return false;

        this.getLoginData(result.payload.items);

        this.rows = result.payload.items;
        this.count = result.payload.count;

        // Trigger change detection since we're using OnPush strategy
        this.cdr.markForCheck();
    }

    getLoginData(users) {
        for (const user of users) {
            if (user.attributes?.shopLoginCount) {
                user.loginCount = user.loginCount ? user.loginCount + user.attributes.shopLoginCount : user.attributes.shopLoginCount;
            }
            if (user.attributes?.lastShopLogin) {
                if (!user.lastLogin)
                    user.lastLogin = user.attributes.lastShopLogin;
                else if (user.attributes?.lastShopLogin > user.lastLogin) {
                    user.lastLogin = user.attributes.lastShopLogin;
                }
            }
        }
    }

  override async changePage(page: number) {
        this.page = page;
        await this.fetchUsers();
    }

    async onPageChange(event: PageEvent) {
        this.page = event.pageIndex + 1;
        this.itemsPerPage = event.pageSize;
        await this.fetchUsers();
    }

    async pageSizeChanged(pagesize){
        this.itemsPerPage = pagesize;
        this.page = 1;

        await this.fetchUsers();
    }

    async onSort(event: Sort) {
        this.sort = {
            prop: event.active,
            dir: event.direction
        };
        await this.fetchUsers();
    }

    async onFilter(property: string, value: any) {
        this.page = 1;
        const result = this.helper.prepareSearchTerm(this.filter, property, value);
        this.filter = result.filter;

        if (!result.resolved)
            await this.fetchUsers();
    }

    async delete(user) {
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            disableClose: true,
            data: {
                title: this.i18n.transform('delete_user'),
                action: 'delete user',
                subject: user.firstname + ' ' + user.lastname,
                completeMessage: this.i18n.transform('are_you_sure_you_want_to_delete_user') + ' ' + user.firstname + ' ' + user.lastname
            }
        });
        dialogRef.closed.subscribe(async (confirmed) => {
            if (!confirmed) return;

            this.usersService.deleteUser(user._id).then(async (result) => {
                if (result.success) {
                    this.juicebox.showToast('success', this.i18n.transform('successfully_deleted'));
                } else {
                    this.juicebox.showToast('error', this.i18n.transform('error_while_deleting'));
                }
                await this.fetchUsers();
            });
        });
    }

    onSelect(event) {
        if (event.type === 'click')
            this.router.navigate(['main/users/details', event.row._id]);
    }

    async openGroupsModal() {
        const dialogRef = this.dialog.open(GroupsModalComponent, {
            width: '80%',
            maxWidth: '1200px',
            disableClose: true
        });
        dialogRef.closed.subscribe(result => {
            if (result?.success) {
                // Handle success if needed
            }
        });
    }

    getGroups(groups: Array<any>, comma = true) {
        return Object.values(groups).map(group => group).join(', ');
    }

    getGroupsTooltip(groups: Array<any>) {
        return Object.values(groups).map(group => group).join('\n');
    }

    //------ORGANISATIONS FILTER
    private async getOrganisations(): Promise<any> {
        const organisationResult = await this.juicebox.getAvailableOrganisations(this.pageOrganisations, 10, {
            sort: this.sortOrganisations,
            filter: this.filterOrganisations
        });
        if (!organisationResult || !organisationResult.success)
            return false;

        this.organisations = [...this.organisations, ...organisationResult.payload.items];
        this.organisationsCount = organisationResult.payload.count;
        this.cdr.markForCheck();
    }

    async organisationChanged(organisation) {
        this.selectedOrganisation = organisation;

        if (!organisation || !organisation._id) {
            return this.resetOrganisation();
        }

        const tmpFilter: Array<ISearchTerm> = this.filter.filter(value => value.property !== 'organisation');
        this.filter = [...tmpFilter, { language: false, fullText: true, property: 'organisation', term: organisation._id }];

        await this.fetchUsers();
        await this.searchOrganisations({ term: '' });
    }

    async searchOrganisations(event: any) {
        this.pageOrganisations = 0;
        const result = this.helper.prepareSearchTerm(this.filterOrganisations, 'name', event.term);
        this.filterOrganisations = result.filter;

        if (!result.resolved) {
            this.organisations = [];
            await this.getOrganisations();
        }
    }

    customSearchOrganisations = (term: string, items: any) => {
        return true;
    };

    async onScrollOrganisations() {
        if (this.organisations.length < this.organisationsCount) {
            this.pageOrganisations = this.organisations.length / 10;
            await this.getOrganisations();
        }
    }

    async resetOrganisation() {
        this.selectedOrganisation = null;
        const tmpFilter: Array<ISearchTerm> = this.filter.filter(value => value.property !== 'organisation');
        this.filter = [...tmpFilter];
        await this.fetchUsers();
    }

    //------GROUPS FILTER for users which have groups role
    async fetchGroups(): Promise<any> {
        if (!this.juicebox.hasRole('groups:role'))
            return;

        const result = await this.usersService.getAllGroups();
        if (!result.success) return false;
        this.groups = result.payload;
        this.filteredGroups = [...this.groups]; // Initialize filtered array
        this.cdr.markForCheck();
    }

    async groupChanged(group: any) {
        this.selectedGroup = group;

        if (!group || !group.key) {
            return this.resetGroup();
        }

        const tmpFilter: Array<ISearchTerm> = this.filter.filter(value => value.property !== 'groups');
        this.filter = [...tmpFilter, { language: false, fullText: true, property: 'groups', term: group.key }];

        await this.fetchUsers();
    }

    async resetGroup() {
        this.selectedGroup = null;
        const tmpFilter: Array<ISearchTerm> = this.filter.filter(value => value.property !== 'groups');
        this.filter = [...tmpFilter];
        await this.fetchUsers();
    }

    //------ROLES FILTER
    async fetchRoles() {
        const result = await this.configurationService.getBySchema('networking:user:role');
        if (!result || !result.success)
            return;

        this.roles = result.payload;
        this.filteredRoles = [...this.roles]; // Initialize filtered array
        this.cdr.markForCheck();
    }

    async roleChanged(role: any) {
        this.selectedRole = role;

        if (!role || !role.key) {
            return this.resetRole();
        }

        const tmpFilter: Array<ISearchTerm> = this.filter.filter(value => value.property !== 'roles');
        this.filter = [...tmpFilter, { language: false, fullText: true, property: 'roles', term: role.key }];

        await this.fetchUsers();
    }

    async resetRole() {
        this.selectedRole = null;
        const tmpFilter: Array<ISearchTerm> = this.filter.filter(value => value.property !== 'roles');
        this.filter = [...tmpFilter];
        await this.fetchUsers();
    }

    searchRoles(searchTerm: string) {
        if (!searchTerm || searchTerm.trim() === '') {
            this.filteredRoles = [...this.roles];
        } else {
            const term = searchTerm.toLowerCase().trim();
            this.filteredRoles = this.roles.filter(role =>
                role.name && role.name.toLowerCase().includes(term)
            );
        }
    }

    searchGroups(searchTerm: string) {
        if (!searchTerm || searchTerm.trim() === '') {
            this.filteredGroups = [...this.groups];
        } else {
            const term = searchTerm.toLowerCase().trim();
            this.filteredGroups = this.groups.filter(group =>
                group.name && group.name.toLowerCase().includes(term)
            );
        }
    }


    async openModalToLoginAsAnotherUser(user: User) {
        const config = await this.configurationService.getByKey('juicebox');
        const options = config.payload.options || {};
        if (!options.twoFactor?.length) {
            this.juicebox.showToast('error', this.i18n.transform('project_needs_to_have_2fa'));
            return;
        }

        if (!this.juicebox.getUser().attributes?.totp || this.juicebox.getUser().attributes?.settings?.twoFactor !== 'totp') {
            this.juicebox.showToast('error', this.i18n.transform('user_needs_totp_2fa'));
            await this.router.navigate(['main/user-profile/details']);
            return;
        }

        const dialogRef = this.dialog.open(LoginAsAnotherUserComponent, {
            disableClose: true,
            data: { user_id: user._id }
        });
        dialogRef.closed.subscribe(async (result) => {
            if (!result?.success)
                return;

            this.juicebox.getJuiceInstance().setToken(result.payload);
            window.location.reload();
        });
    }

    // Initialize filter configurations for reusable filter component
    private initializeFilterConfigs(): void {
        this.filterConfigs = [
            {
                key: 'organisation',
                label: this.i18n.transform('organisation'),
                icon: 'business',
                placeholder: this.i18n.transform('select_organisation'),
                options: this.organisations,
                selectedValue: this.selectedOrganisation,
                displayProperty: 'name'
            },
            {
                key: 'role',
                label: this.i18n.transform('role'),
                icon: 'admin_panel_settings',
                placeholder: this.i18n.transform('select_role'),
                options: this.filteredRoles,
                selectedValue: this.selectedRole,
                displayProperty: 'name'
            }
        ];

        // Only add group filter if user has permission
        if (this.juicebox.hasPermission('groups:role#read')) {
            this.filterConfigs.push({
                key: 'group',
                label: this.i18n.transform('group'),
                icon: 'group',
                placeholder: this.i18n.transform('select_group'),
                options: this.filteredGroups,
                selectedValue: this.selectedGroup,
                displayProperty: 'name'
            });
        }
    }

    // Update filter configurations when options change
    private updateFilterConfigs(): void {
        this.filterConfigs.forEach(config => {
            switch (config.key) {
                case 'organisation':
                    config.options = [...this.organisations]; // Create new array reference
                    config.selectedValue = this.selectedOrganisation;
                    break;
                case 'role':
                    config.options = [...this.filteredRoles]; // Create new array reference
                    config.selectedValue = this.selectedRole;
                    break;
                case 'group':
                    config.options = [...this.filteredGroups]; // Create new array reference
                    config.selectedValue = this.selectedGroup;
                    break;
            }
        });
    }

    // Handle filter changes from reusable filter component
    onFilterChanged(event: {key: string, value: any}): void {
        switch (event.key) {
            case 'organisation':
                this.organisationChanged(event.value);
                break;
            case 'role':
                this.roleChanged(event.value);
                break;
            case 'group':
                this.groupChanged(event.value);
                break;
        }
        this.updateFilterConfigs();
    }

    // Handle filter searches from reusable filter component
    async onFilterSearched(event: {key: string, term: string}): Promise<void> {
        switch (event.key) {
            case 'organisation':
                await this.searchOrganisations({term: event.term});
                break;
            case 'role':
                this.searchRoles(event.term);
                break;
            case 'group':
                this.searchGroups(event.term);
                break;
        }
        this.updateFilterConfigs();
    }

}
