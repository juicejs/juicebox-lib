import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListingComponent} from '../../../../shared/components/listing/listing.component';
import { JuiceboxService} from '../../../../shared/services/Juicebox.service';
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
        SharedModule,
        UserTranslationPipe
    ]
})
export class OrganisationsUserComponent extends ListingComponent implements OnInit {

    organisations: any[] = [];
    selectedOrganisation = signal<any>(null);

    organisationsCount: number = 0;

    promiseBtn: any;
    i18n: any;

    loggedInOrganisationId: string;
    loggedInUserId: string;
    userId: string;
    displayedColumns: string[] = ['name', 'actions'];

    private aRoute = inject(ActivatedRoute);
    private userService = inject(UsersService);
    private router = inject(Router);
    private dialog = inject(DialogService);

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
        const organisationResult = await this.juicebox.getAvailableOrganisations(0, 1000, {
            sort: { prop: "name", dir: "asc" },
            filter: []
        });
        if (!organisationResult || !organisationResult.success)
            return false;

        this.organisations = organisationResult.payload.items.filter(o =>
            this.rows().findIndex(row => row._id === o._id) < 0
        );
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

        this.rows.set([...result.payload.filter(org => organisations.includes(org._id))]);
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
            this.organisations = [...this.organisations, org];
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
            this.organisations = this.organisations.filter(o => o._id !== addedId);
            this.selectedOrganisation.set(null);
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
