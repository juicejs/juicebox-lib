import { Component, DestroyRef, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { ListingComponent} from '../../../../shared/components/listing/listing.component';
import { JuiceboxService} from '../../../../shared/services/Juicebox.service';
import { ActivatedRoute } from '@angular/router';
import { UsersService } from '../../users.service';
import { ConfirmationDialogComponent} from '../../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { DialogService, ProgressSpinnerComponent } from '../../../../../ui-components';
import { UserTranslationPipe } from '../../i18n/user.translation';
import { SharedModule } from '../../../../shared/shared.module';
import { HelperService } from '../../../../shared/services/helper.service';
import { ISearchTerm } from '../../../../shared/interfaces/ISearchTerm';
import { CreateOrganisationComponent } from './create-organisation/create-organisation.component';

@Component({
    selector: 'app-organisations-user',
    templateUrl: './organisations-user.component.html',
    styleUrls: ['./organisations-user.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    SharedModule,
    UserTranslationPipe,
    ProgressSpinnerComponent
]
})
export class OrganisationsUserComponent extends ListingComponent implements OnInit {

    /** The picker's options: available organisations the user isn't in, loaded a page at a time as in the old app */
    readonly organisations = signal<any[]>([]);
    selectedOrganisation = signal<any>(null);
    /** The user's organisations and the dropdown's options are still loading */
    protected readonly isLoading = signal(true);

    private readonly ORGANISATIONS_PAGE_SIZE = 10;
    private organisationsPage = 0;
    private organisationsCount = 0;
    private organisationsFilter: Array<ISearchTerm> = [];
    /** Counts the requests, so a slower older answer can't overwrite a newer search */
    private organisationsRequest = 0;
    private loadingOrganisations = false;
    private searchTimer?: ReturnType<typeof setTimeout>;

    promiseBtn: any;
    i18n: any;

    loggedInOrganisationId: string;
    loggedInUserId: string;
    userId: string;
    displayedColumns: string[] = ['name', 'actions'];

    private aRoute = inject(ActivatedRoute);
    private userService = inject(UsersService);
    private dialog = inject(DialogService);
    private helper = inject(HelperService);

    constructor() {
        super();
        inject(DestroyRef).onDestroy(() => clearTimeout(this.searchTimer));
    }

  override async ngOnInit(): Promise<void> {
        this.loggedInUserId = this.juicebox.getUserId();
        this.userId = this.aRoute.snapshot.parent.params['id'];
        this.i18n = new UserTranslationPipe(this.juicebox);
        const result = await this.juicebox.getLoggedInOrganisation();
        if (result?._id)
            this.loggedInOrganisationId = result._id;

        try {
            await this.getUserOrganisations(this.userId);
            await this.getOrganisations(true);
        } finally {
            this.isLoading.set(false);
        }
    }

    /** `reset` starts again at the first page (on load and for a new search); otherwise the next page is added */
    private async getOrganisations(reset = false): Promise<void> {
        const request = ++this.organisationsRequest;
        const page = reset ? 0 : this.organisationsPage;
        this.loadingOrganisations = true;
        try {
            const organisationResult = await this.juicebox.getAvailableOrganisations(page, this.ORGANISATIONS_PAGE_SIZE, {
                sort: { prop: "name", dir: "asc" },
                filter: this.organisationsFilter
            });
            if (request !== this.organisationsRequest || !organisationResult?.success) return;

            const memberIds = new Set(this.rows().map(row => row._id));
            const items = organisationResult.payload.items.filter(o => !memberIds.has(o._id));
            this.organisations.update(list => reset ? items : [...list, ...items]);
            this.organisationsCount = organisationResult.payload.count;
            this.organisationsPage = page + 1;
            // A page of organisations the user is already in adds nothing to the picker, so the next one follows
            if (!items.length && this.hasMoreOrganisations()) await this.getOrganisations();
        } finally {
            if (request === this.organisationsRequest) this.loadingOrganisations = false;
        }
    }

    private hasMoreOrganisations(): boolean {
        return this.organisationsPage * this.ORGANISATIONS_PAGE_SIZE < this.organisationsCount;
    }

    /** Searches the names on the server, 500 ms after the last keystroke (as the old picker did) */
    onOrganisationSearch(term: string) {
        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => {
            const result = this.helper.prepareSearchTerm(this.organisationsFilter, 'name', term);
            this.organisationsFilter = result.filter;
            if (!result.resolved) this.getOrganisations(true);
        }, 500);
    }

    /** The next page once the end of the options is in view (scrolled to, or the options don't fill the panel) */
    loadMoreOrganisations() {
        if (this.loadingOrganisations || !this.hasMoreOrganisations()) return;
        this.getOrganisations();
    }

    private async getUserOrganisations(user_id: string): Promise<any> {
        const user = await this.userService.getUser(user_id);
        if (!user.success)
            return;

        const organisations = Object.keys(user.payload.roles);
        const result = await this.juicebox.getOrganisations(user_id);
        // An empty answer empties the table too (the last organisation was removed)
        this.rows.set((result?.payload ?? []).filter(org => organisations.includes(org._id)));
    }

    organisationChanged(org) {
        this.selectedOrganisation.set(org);
    }

    trackById = (_: number, row: any) => row._id;

    delete(org) {
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            disableClose: true,
            data: {
                subject: this.i18n.transform('organisation') + ": " + org.name,
                action: this.i18n.transform('delete'),
                destructive: true
            }
        });
        dialogRef.closed.subscribe(async (result) => {
            if (!result) return;
            const user_id = this.aRoute.snapshot.parent.params['id'];
            const deleteResult = await this.juicebox.removeOrganisationFromUser(user_id, org._id);
            if (!deleteResult.success) {
                this.juicebox.showToast("error", deleteResult.error);
                return;
            }

            this.juicebox.showToast("success", "Success");
            await this.getUserOrganisations(user_id);
            this.organisations.update(list => [...list, org]);
        });
    }

    add() {
        if (!this.selectedOrganisation()) {
            this.juicebox.showToast('warning', "Select organisation");
            return;
        }

        this.promiseBtn = (async () => {
            const user_id = this.aRoute.snapshot.parent.params['id'];
            const result = await this.juicebox.addOrganisationToUser(user_id, this.selectedOrganisation()._id);
            if (!result.success) {
                this.juicebox.showToast("error", result.error);
                return;
            }

            this.juicebox.showToast("success", "Success");
            const addedId = this.selectedOrganisation()._id;
            await this.getUserOrganisations(user_id);
            this.organisations.update(list => list.filter(o => o._id !== addedId));
            this.selectedOrganisation.set(null);
        })();
    }


    async createNewOrg() {
        if (!this.juicebox.hasPermission("entities:role#create")) {
            this.juicebox.showToast("error", "Missing permission");
            return;
        }

        // The old app opened its entity wizard here; the lib has no entities module, so the form is a dialog
        const dialogRef = this.dialog.open(CreateOrganisationComponent, { disableClose: true });
        dialogRef.closed.subscribe(async (created: any) => {
            if (!created) return;
            // Offer the new organisation in the picker, ready to be added to the user
            this.organisations.update(list => [created, ...list.filter(org => org._id !== created._id)]);
            this.selectedOrganisation.set(created);
        });
    }

}
