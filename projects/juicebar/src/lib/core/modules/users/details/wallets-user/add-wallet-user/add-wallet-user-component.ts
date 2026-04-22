import {Component, Inject, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormControl, FormGroup, Validators, ReactiveFormsModule} from '@angular/forms';
import {MatDialogRef, MAT_DIALOG_DATA, MatDialogModule} from '@angular/material/dialog';
import {ActivatedRoute, Router} from '@angular/router';
import {UsersService} from '../../../users.service';
import {UserTranslationPipe} from '../../../i18n/user.translation';
import {CustomValidators} from '../../../../../shared/CustomValidators';
import {JuiceboxService} from '../../../../../shared/services/Juicebox.service';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatSelectModule} from '@angular/material/select';
import {SharedModule} from '../../../../../shared/shared.module';


@Component({
    selector: 'app-add-wallet-user',
    templateUrl: './add-wallet-user.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatSelectModule,
        SharedModule,
        UserTranslationPipe
    ]
})
export class AddWalletUserComponent implements OnInit {

    public walletForm: FormGroup;
    public publishers: Array<any>;
    public publisher: any;
    public user: any = {
        wallets: {
            name: "",
            address: "",
            privateKey: ""
        }
    };

    id: any;

    public updatePromise = null;
    private i18n: UserTranslationPipe;

    constructor(
                private userService: UsersService,
                private dialogRef: MatDialogRef<AddWalletUserComponent>,
                @Inject(MAT_DIALOG_DATA) public data: { id: any },
                public route: ActivatedRoute,
                private juicebox: JuiceboxService,
                public router: Router) {
        this.i18n = new UserTranslationPipe(this.juicebox);
        this.id = this.data?.id;
    }

    async ngOnInit() {

        this.walletForm = new FormGroup({
            publisher: new FormControl(null, Validators.required),
            name: new FormControl(null, Validators.required),
            address: new FormControl(null, CustomValidators.addressLength),
            privateKey: new FormControl(null)
        });

        await this.fetchPublishers(0,100, {});
    }

    async fetchPublishers(page, pageSize, filter){
        this.juicebox.pleaseExtendYourServiceDontDoThis().request(
            "juicechain:publishers",
            "fetch",
            [page, pageSize,{filters:filter}]
        ).then(result => {
            this.publishers = result.payload.publishers;
            if (this.publishers.length == 1) {
                this.publisher = this.publishers[0].id;
                console.log(this.publisher);
            }
        })
    }
    create(): any {
        this.walletForm.markAllAsTouched();
        if (this.walletForm.invalid) return new Promise(resolve => setTimeout(resolve, 200));

        this.updatePromise = (async () => {
            if (!this.user.wallets.privateKey){
                const result = await this.userService.createWallet(this.id, {
                    address: this.user.wallets.address,
                    name: this.user.wallets.name,
                    publisherId: this.publisher,
                    transferLock: 2
                });
                if (result.success) {
                    this.juicebox.showToast("success", this.i18n.transform(this.walletForm.value.address ? 'wallet_added' : 'wallet_created'));
                    this.dialogRef.close();
                    await this.router.navigateByUrl("/main/users/details/"+this.id+"/wallets-user");
                } else {
                    this.juicebox.showToast("error", this.i18n.transform(this.walletForm.value.address ? 'wallet_add_failed' : 'wallet_create_failed'));
                    if (result.message) {
                        this.juicebox.showToast("warning", this.i18n.transform(result.message));
                    }
                }
            }


        })();
    }

    cancel(){
        this.dialogRef.close();
    }
}
