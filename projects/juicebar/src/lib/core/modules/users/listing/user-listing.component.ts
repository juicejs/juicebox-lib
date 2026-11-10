import { Component, inject, OnDestroy, OnInit, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { UsersService } from '../users.service';
import { ListingComponent } from '../../../shared/components/listing/listing.component';
import { Router, RouterLink } from '@angular/router';
import { UserTranslationPipe } from '../i18n/user.translation';
import { DialogService, PageEvent, DataTableComponent, CellDefDirective, CompactRowDefDirective, HeaderDefDirective, ColumnConfig, SortState } from '../../../../ui-components';
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
import {SHARED_IMPORTS} from '../../../shared/shared-imports';
import {injectListingPane, ListingStateService} from '../../../shared/components/listing-pane/listing-pane';

/** What the listing shows, kept for the compact list next to an open user */
interface UsersListingState {
    page: number;
    pageSize: number;
    sort: ISort;
    filter: Array<ISearchTerm>;
}

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
        FilterBarComponent,
        SHARED_IMPORTS,
        UserTranslationPipe,
        DataTableComponent,
        CellDefDirective,
        CompactRowDefDirective,
        HeaderDefDirective,
        RouterLink
    ]
})
export class UserListingComponent extends ListingComponent implements OnInit, OnDestroy {

    /** Set when this is the compact list next to an open user (the split view), not the page itself */
    protected readonly pane = injectListingPane();
    private readonly listingState = inject(ListingStateService);

    protected readonly sortSig = signal<ISort>({ dir: 'asc', prop: 'lastname' });
    protected readonly filterSig = signal<Array<ISearchTerm>>([]);
    i18n: UserTranslationPipe;
    protected readonly count = signal<number>(0);
    protected readonly rowsSig = signal<Array<any>>([]);
    protected readonly pageSig = signal<number>(1);
    protected readonly itemsPerPageSig = signal<number>(10);
    protected readonly canLoginAsOther = computed(() =>
        this.juicebox.getUser().attributes?.settings?.twoFactor === 'totp'
    );
    loggedInOrganisationId: string;

    protected readonly organisations = signal<Array<any>>([]);
    sortOrganisations: ISort = { dir: 'asc', prop: 'name' };
    filterOrganisations: Array<ISearchTerm> = [];
    /** As in the old filter: organisations are loaded 10 at a time, the next page when the list reaches its end */
    private readonly ORGANISATIONS_PAGE_SIZE = 10;
    private organisationsPage = 0;
    private organisationsCount = 0;
    private loadingOrganisations = false;
    /** Counts the requests, so an answer for an older search can't add to a newer list */
    private organisationsRequest = 0;
    private organisationSearchTimer?: ReturnType<typeof setTimeout>;

    protected readonly groups = signal<Array<any>>([]);
    protected readonly filteredGroups = signal<Array<any>>([]);

    protected readonly roles = signal<Array<any>>([]);
    protected readonly filteredRoles = signal<Array<any>>([]);

    // Selected filter values for filter buttons
    protected readonly selectedOrganisation = signal<any>(null);
    protected readonly selectedRole = signal<any>(null);
    protected readonly selectedGroup = signal<any>(null);

    // Filter configurations for reusable filter component
    protected readonly filterConfigs = signal<FilterConfig[]>([]);

    actionButtons: Array<ActionButton> = [];
    displayedColumns: string[] = ['firstname', 'lastname', 'email', 'active', 'roles_count', 'groups', 'lastLogin', 'loginCount'];

    tableColumns: ColumnConfig[] = [
        { key: 'firstname',   label: '', sortable: true },
        { key: 'lastname',    label: '', sortable: true },
        { key: 'email',       label: '', sortable: true },
        { key: 'active',      label: '', width: '100px',  align: 'center', ellipsis: false, sortable: true },
        { key: 'roles_count', label: '', width: '150px', align: 'right', ellipsis: false },
        { key: 'groups',      label: '', width: '220px' },
        { key: 'lastLogin',   label: '', width: '140px', sortable: true },
        { key: 'loginCount',  label: '', width: '140px', align: 'right', sortable: true },
        { key: 'actions',     label: '', width: '96px', align: 'right', ellipsis: false }
    ];

    public usersService = inject(UsersService);
    public helper = inject(HelperService);
    private router = inject(Router);
    private dialog = inject(DialogService);
    private configurationService = inject(ConfigurationService);

    public override async ngOnInit(): Promise<void> {
        this.i18n = new UserTranslationPipe(this.juicebox);

        const labels: Record<string, string> = {
            firstname: this.i18n.transform('firstname'),
            lastname: this.i18n.transform('lastname'),
            email: this.i18n.transform('email'),
            active: this.i18n.transform('active'),
            roles_count: this.i18n.transform('roles_count'),
            groups: this.i18n.transform('groups'),
            lastLogin: this.i18n.transform('last_login'),
            loginCount: this.i18n.transform('login_count'),
            actions: this.i18n.transform('actions')
        };
        this.tableColumns = this.tableColumns.map(c => ({ ...c, label: labels[c.key] || c.label }));

        this.loggedInOrganisationId = this.juicebox.getUser().organisation_id;

        // The compact list: the rows the listing showed last, without the page's title, buttons and filters
        if (this.pane) {
            const state = this.listingState.restore<UsersListingState>('users');
            if (state) {
                this.pageSig.set(state.page);
                this.itemsPerPageSig.set(state.pageSize);
                this.sortSig.set(state.sort);
                this.filterSig.set(state.filter);
            }
            await this.fetchUsers();
            return;
        }

        this.juicebox.navigationEvent({
            location: this.i18n.transform('users'),
            subject: this.i18n.transform('user_list'),
            link: 'main/users'
        });

        // Main action last and primary; Groups as a secondary (ghost) button, as in the design
        const actionButtons = [{
            title: this.i18n.transform("groups"),
            type: "btn-secondary",
            icon: "group_add",
            permissions: "groups:role#read",
            routerLink: "user-wizard",
            callback: () => { this.openGroupsModal() }
        }, {
            title: this.i18n.transform("add_new"),
            type: "btn-primary",
            icon: "add",
            permissions: "users:role#create",
            routerLink: "user-wizard",
            callback: () => { this.router.navigate(["/main/users/user-wizard"]) }
        }];

        // Buttons the project registered via UsersService.addCustomActionButton
        actionButtons.push(...this.usersService.customActionButtons);
        this.juicebox.setActionButtons(actionButtons);

        await Promise.all([
            this.fetchUsers(),
            this.getOrganisations(),
            this.fetchRoles(),
            this.fetchGroups()
        ]);

        // Initialize filter configurations
        this.initializeFilterConfigs();
    }

    ngOnDestroy() {
        clearTimeout(this.organisationSearchTimer);
    }

    private async fetchUsers(): Promise<any> {
        this.listingState.save('users', {
            page: this.pageSig(),
            pageSize: this.itemsPerPageSig(),
            sort: this.sortSig(),
            filter: this.filterSig(),
        } satisfies UsersListingState);
        const result = await this.usersService.fetch(this.loggedInOrganisationId, this.pageSig() - 1, this.itemsPerPageSig(), this.sortSig(), this.filterSig());
        if (!result.success)
            return false;

        this.getLoginData(result.payload.items);

        this.rowsSig.set(result.payload.items);
        this.count.set(result.payload.count);
    }

    getLoginData(users: Array<any>) {
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

            const groupList: string[] = user.groups
                ? (Object.values(user.groups) as string[][]).flat().filter(g => !!g && g.trim().length > 0)
                : [];
            user.groupsList = groupList;
            user.groupsShown = groupList.slice(0, 2);
            user.groupsTooltip = groupList.join(', ');
            user.hasGroups = groupList.length > 0;
        }
    }

    override async changePage(page: number) {
        this.pageSig.set(page);
        await this.fetchUsers();
    }

    async onPageChange(event: PageEvent) {
        this.pageSig.set(event.pageIndex + 1);
        this.itemsPerPageSig.set(event.pageSize);
        await this.fetchUsers();
    }

    async pageSizeChanged(pagesize: number) {
        this.itemsPerPageSig.set(pagesize);
        this.pageSig.set(1);
        await this.fetchUsers();
    }

    async onSort(event: SortState) {
        this.sortSig.set({ prop: event.prop, dir: event.dir });
        this.pageSig.set(1);
        await this.fetchUsers();
    }

    async onFilter(property: string, value: string) {
        this.pageSig.set(1);
        const result = this.helper.prepareSearchTerm(this.filterSig(), property, value);
        this.filterSig.set(result.filter);

        if (!result.resolved)
            await this.fetchUsers();
    }

    async delete(user: User) {
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            disableClose: true,
            data: {
                title: this.i18n.transform('delete_user'),
                action: 'delete user',
                destructive: true,
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

    onSelect(event: { type: string; row: User }) {
        if (event.type === 'click')
            this.router.navigate(['main/users/details', event.row._id]);
    }

    async openGroupsModal() {
        const dialogRef = this.dialog.open(GroupsModalComponent, {
            width: '80%',
            maxWidth: '1200px',
            disableClose: true, closeOnEscape: false
        });
        dialogRef.closed.subscribe(result => {
            if (result?.success) {
                // Handle success if needed
            }
        });
    }

    //------ORGANISATIONS FILTER
    /** The next page of organisations, added to the list */
    private async getOrganisations(): Promise<any> {
        const request = ++this.organisationsRequest;
        this.loadingOrganisations = true;
        try {
            const organisationResult = await this.juicebox.getAvailableOrganisations(this.organisationsPage, this.ORGANISATIONS_PAGE_SIZE, {
                sort: this.sortOrganisations,
                filter: this.filterOrganisations
            });
            if (request !== this.organisationsRequest || !organisationResult?.success)
                return false;

            this.organisations.update(list => [...list, ...organisationResult.payload.items]);
            this.organisationsCount = organisationResult.payload.count;
            this.organisationsPage++;
            this.updateFilterConfigs();
        } finally {
            if (request === this.organisationsRequest) this.loadingOrganisations = false;
        }
    }

    private async loadMoreOrganisations() {
        if (this.loadingOrganisations || this.organisations().length >= this.organisationsCount) return;
        await this.getOrganisations();
    }

    async organisationChanged(organisation: any) {
        this.selectedOrganisation.set(organisation);

        if (!organisation || !organisation._id) {
            return this.resetOrganisation();
        }

        this.pageSig.set(1);
        const tmpFilter: Array<ISearchTerm> = this.filterSig().filter(v => v.property !== 'organisation');
        this.filterSig.set([...tmpFilter, { language: false, fullText: true, property: 'organisation', term: organisation._id }]);

        await this.fetchUsers();
        await this.searchOrganisations({ term: '' });
    }

    async searchOrganisations(event: any) {
        const result = this.helper.prepareSearchTerm(this.filterOrganisations, 'name', event.term);
        this.filterOrganisations = result.filter;

        if (!result.resolved || this.organisations().length === 0) {
            this.organisationsPage = 0;
            this.organisations.set([]);
            await this.getOrganisations();
        }
    }

    customSearchOrganisations = (term: string, items: any) => {
        return true;
    };

    async resetOrganisation() {
        this.selectedOrganisation.set(null);
        this.pageSig.set(1);
        this.filterSig.set(this.filterSig().filter(v => v.property !== 'organisation'));
        await this.fetchUsers();
    }

    //------GROUPS FILTER for users which have groups role
    async fetchGroups(): Promise<any> {
        if (!this.juicebox.hasRole('groups:role'))
            return;

        const result = await this.usersService.getAllGroups();
        if (!result.success) return false;
        this.groups.set(result.payload);
        this.filteredGroups.set([...result.payload]); // Initialize filtered array
    }

    async groupChanged(group: any) {
        this.selectedGroup.set(group);

        if (!group || !group.key) {
            return this.resetGroup();
        }

        this.pageSig.set(1);
        const tmpFilter: Array<ISearchTerm> = this.filterSig().filter(v => v.property !== 'groups');
        this.filterSig.set([...tmpFilter, { language: false, fullText: true, property: 'groups', term: group.key }]);

        await this.fetchUsers();
    }

    async resetGroup() {
        this.selectedGroup.set(null);
        this.pageSig.set(1);
        this.filterSig.set(this.filterSig().filter(v => v.property !== 'groups'));
        await this.fetchUsers();
    }

    //------ROLES FILTER
    async fetchRoles() {
        const result = await this.configurationService.getBySchema('networking:user:role');
        if (!result || !result.success)
            return;

        this.roles.set(result.payload);
        this.filteredRoles.set([...result.payload]); // Initialize filtered array
    }

    async roleChanged(role: any) {
        this.selectedRole.set(role);

        if (!role || !role.key) {
            return this.resetRole();
        }

        this.pageSig.set(1);
        const tmpFilter: Array<ISearchTerm> = this.filterSig().filter(v => v.property !== 'roles');
        this.filterSig.set([...tmpFilter, { language: false, fullText: true, property: 'roles', term: role.key }]);

        await this.fetchUsers();
    }

    async resetRole() {
        this.selectedRole.set(null);
        this.pageSig.set(1);
        this.filterSig.set(this.filterSig().filter(v => v.property !== 'roles'));
        await this.fetchUsers();
    }

    searchRoles(searchTerm: string) {
        if (!searchTerm || searchTerm.trim() === '') {
            this.filteredRoles.set([...this.roles()]);
        } else {
            const term = searchTerm.toLowerCase().trim();
            this.filteredRoles.set(this.roles().filter(role =>
                role.name && role.name.toLowerCase().includes(term)
            ));
        }
    }

    searchGroups(searchTerm: string) {
        if (!searchTerm || searchTerm.trim() === '') {
            this.filteredGroups.set([...this.groups()]);
        } else {
            const term = searchTerm.toLowerCase().trim();
            this.filteredGroups.set(this.groups().filter(group =>
                group.name && group.name.toLowerCase().includes(term)
            ));
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
            disableClose: true, closeOnEscape: false,
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
        const configs: FilterConfig[] = [
            {
                key: 'organisation',
                label: this.i18n.transform('organisation'),
                placeholder: this.i18n.transform('select_organisation'),
                options: this.organisations(),
                selectedValue: this.selectedOrganisation(),
                displayProperty: 'name'
            },
            {
                key: 'role',
                label: this.i18n.transform('role'),
                placeholder: this.i18n.transform('select_role'),
                options: this.filteredRoles(),
                selectedValue: this.selectedRole(),
                displayProperty: 'name'
            }
        ];

        // Only add group filter if user has permission
        if (this.juicebox.hasPermission('groups:role#read')) {
            configs.push({
                key: 'group',
                label: this.i18n.transform('group'),
                placeholder: this.i18n.transform('select_group'),
                options: this.filteredGroups(),
                selectedValue: this.selectedGroup(),
                displayProperty: 'name'
            });
        }

        this.filterConfigs.set(configs);
    }

    // Update filter configurations when options change
    private updateFilterConfigs(): void {
        this.filterConfigs.update(configs => {
            return configs.map(config => {
                switch (config.key) {
                    case 'organisation':
                        return { ...config, options: [...this.organisations()], selectedValue: this.selectedOrganisation() };
                    case 'role':
                        return { ...config, options: [...this.filteredRoles()], selectedValue: this.selectedRole() };
                    case 'group':
                        return { ...config, options: [...this.filteredGroups()], selectedValue: this.selectedGroup() };
                    default:
                        return config;
                }
            });
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
                // As in the old filter: the server search waits 500 ms after the last keystroke
                clearTimeout(this.organisationSearchTimer);
                this.organisationSearchTimer = setTimeout(async () => {
                    await this.searchOrganisations({term: event.term});
                    this.updateFilterConfigs();
                }, 500);
                return;
            case 'role':
                this.searchRoles(event.term);
                break;
            case 'group':
                this.searchGroups(event.term);
                break;
        }
        this.updateFilterConfigs();
    }

    /** The organisation filter's next page once its list reaches the end */
    onFilterScrolledToEnd(key: string): void {
        if (key === 'organisation') this.loadMoreOrganisations();
    }

}
