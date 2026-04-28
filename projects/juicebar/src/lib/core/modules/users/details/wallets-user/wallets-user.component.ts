import {Component, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {UsersService} from '../../users.service';
import {ActivatedRoute, Router} from '@angular/router';
import {ListingComponent} from '../../../../shared/components/listing/listing.component';
import {DialogService} from '../../../../../ui-components';
import {AddWalletUserComponent} from './add-wallet-user/add-wallet-user-component';
import {UserTranslationPipe} from '../../i18n/user.translation';
import {DetailsUsersComponent} from '../details.component';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {SharedModule} from '../../../../shared/shared.module';

@Component({
    selector: 'app-wallets-user',
    styleUrls: ['wallets-user.component.css'],
    templateUrl: './wallets-user.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        SharedModule,
        UserTranslationPipe
    ]
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
                       private dialog: DialogService) {
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
        dialogRef.closed.subscribe((result) => {
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
