import {Component} from '@angular/core';
import {UsersService} from '../../users.service';
import {ActivatedRoute, Router} from '@angular/router';
import {ListingComponent} from '../../../../shared/components/listing/listing.component';
import {MatDialog} from '@angular/material/dialog';
import {AddWalletUserComponent} from './add-wallet-user/add-wallet-user-component';
import {UserTranslationPipe} from '../../i18n/user.translation';
import {DetailsUsersComponent} from '../details.component';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';

@Component({
    selector: 'app-wallets-user',
    styleUrls: ['wallets-user.component.css'],
    templateUrl: './wallets-user.component.html'
})
export class WalletsUserComponent extends ListingComponent{

    override rows = [];
    public user: any;
    public searchTerm: string;
    displayedColumns: string[] = ['name', 'address'];

    public constructor(private usersService: UsersService,
                       protected override juicebox: JuiceboxService,
                       private router: Router,
                       private userDetails: DetailsUsersComponent,
                       private route: ActivatedRoute,
                       private dialog: MatDialog) {
        super(juicebox);

        this.juicebox.setActionButtons([{
            title: "add_new",
            icon: "fa-plus-circle",
            type: "btn-primary",
            callback: () => { this.openDialog() }
        }]);
    }

    openDialog() {
        const dialogRef = this.dialog.open(AddWalletUserComponent, {
            disableClose: true,
            data: { id: this.user._id }
        });
        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.ngOnInit();
            }
        });
    }

    public override ngOnInit(): void {
        const i18n = new UserTranslationPipe(this.juicebox);

        this.columns = [
            {name: i18n.transform('name'), prop: "name" },
            {name: i18n.transform('address'), prop: "address" }
        ];
        this.route.parent.params.subscribe(params => {
            this.usersService.getUser(params['id']).then(result => {
                this.user = result.payload;
                this.id = result.payload._id;
                this.rows = result.payload.wallets;

                this.juicebox.navigationEvent({
                    location: i18n.transform('users'),
                    subject: result.payload.email + ' - ' + i18n.transform('wallet'),
                    link: '/main/users'
                });

            });
        });
    }

}
