import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ListingComponent} from '../../../../shared/components/listing/listing.component';
import { JuiceboxService} from '../../../../shared/services/Juicebox.service';
import { ISearchTerm} from '../../../../shared/interfaces/ISearchTerm';
import { HelperService} from '../../../../shared/services/helper.service';
import { ActivatedRoute, NavigationExtras, Router } from '@angular/router';
import { UsersService } from '../../users.service';
import { ConfirmationDialogComponent} from '../../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { DialogService } from '../../../../../ui-components';
import { UserTranslationPipe } from '../../i18n/user.translation';
import { SharedModule } from '../../../../shared/shared.module';

@Component({
    selector: 'app-organisations-user',
    templateUrl: './organisations-user.component.html',
    styleUrls: ['./organisations-user.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        SharedModule,
        UserTranslationPipe
    ]
})
export class OrganisationsUserComponent extends ListingComponent implements OnInit {

    organisations: any[] = [];
    selectedOrganisation: any = null;
    organisationControl = new FormControl();

    pageOrgs: number = 0;
    filterOrganisations: ISearchTerm[] = [];
    organisationsCount: number = 0;

    promiseBtn: any;
    i18n: any;

    loggedInOrganisationId: string;
    loggedInUserId: string;
    userId: string;
    displayedColumns: string[] = ['name', 'actions'];

    constructor(public override juicebox: JuiceboxService,
                private helper: HelperService,
                private aRoute: ActivatedRoute,
                private userService: UsersService,
                private router: Router,
                private dialog: DialogService) {
        super(juicebox);
    }

  override async ngOnInit(): Promise<void> {
        this.loggedInUserId = this.juicebox.getUserId();
        this.userId = this.aRoute.snapshot.parent.params['id'];
        this.i18n = new UserTranslationPipe(this.juicebox);
        const result = await this.juicebox.getLoggedInOrganisation();
        if (result?._id)
            this.loggedInOrganisationId = result._id;

        await this.getUserOrganisations(this.userId);
        await this.getOrganisations();
    }

    private async getOrganisations(): Promise<any> {
        const organisationResult = await this.juicebox.getAvailableOrganisations(this.pageOrgs, 10, {
            sort: { prop: "name", dir: "asc" },
            filter: this.filterOrganisations
        });
        if (!organisationResult || !organisationResult.success)
            return false;

        const tmpOrgs = organisationResult.payload.items.filter(o => {
            if (this.rows.findIndex(row => row._id === o._id) < 0)
                return o;
        });

        this.organisations = [...this.organisations, ...tmpOrgs];
        this.organisationsCount = organisationResult.payload.count;
    }

    private async getUserOrganisations(user_id: string): Promise<any> {
        const user = await this.userService.getUser(user_id);
        if (!user.success)
            return;

        const organisations = Object.keys(user.payload.roles);
        const result = await this.juicebox.getOrganisations(user_id);
        if (!result.payload || !result.payload.length)
            return false;

        this.rows = [...result.payload.filter(org => organisations.includes(org._id))];
    }

    organisationChanged(org) {
        this.selectedOrganisation = org;
    }

    async searchOrganisations(event: any) {
        this.pageOrgs = 0;
        const result = this.helper.prepareSearchTerm(this.filterOrganisations, 'name', event.term);
        this.filterOrganisations = result.filter;

        if (!result.resolved){
            this.organisations = [];
            await this.getOrganisations();
        }
    }

    displayOrgName = (org: any): string => {
        return org?.name || '';
    }

    customSearchOrganisations = (term: string, items: any) => {
        return true;
    }

    async onScrollOrganisations() {
        if (this.organisations.length < this.organisationsCount) {
            this.pageOrgs = this.organisations.length / 10;
            await this.getOrganisations();
        }
    }

    delete(org) {
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            disableClose: true,
            data: {
                subject: this.i18n.transform('organisation') + ": " + org.name,
                action: this.i18n.transform('delete')
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
        });
    }

    add() {
        if (!this.selectedOrganisation) {
            this.juicebox.showToast('warning', "Select organisation");
            return;
        }

        this.promiseBtn = (async () => {
            const user_id = this.aRoute.snapshot.parent.params['id'];
            const result = await this.juicebox.addOrganisationToUser(user_id, this.selectedOrganisation._id);
            if (!result.success) {
                this.juicebox.showToast("error", result.error);
                return;
            }

            this.juicebox.showToast("success", "Success");
            await this.getUserOrganisations(user_id);
            this.selectedOrganisation = null;
            this.organisationControl.setValue('');
        })();
    }


    async createNewOrg() {
        if (!this.juicebox.hasPermission("entities:role#create")) {
            this.juicebox.showToast("error", "Missing permission");
            return;
        }

        const navigationExtras: NavigationExtras = {
            state: {
                selectedType: { name: "Organisation", prop: "organisation" },
                types: [{ name: "Organisation", prop: "organisation" }]
            }
        };
        await this.router.navigate(['/main/entities/entity-wizard'], navigationExtras);
    }

}
