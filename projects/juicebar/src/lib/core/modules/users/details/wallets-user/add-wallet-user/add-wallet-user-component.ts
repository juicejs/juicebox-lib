import {Component, inject, OnInit, ChangeDetectionStrategy, signal} from '@angular/core';
import {FormControl, FormGroup, Validators, ReactiveFormsModule} from '@angular/forms';
import {DialogRef, DIALOG_DATA} from '@angular/cdk/dialog';
import {ActivatedRoute, Router} from '@angular/router';
import {UsersService} from '../../../users.service';
import {UserTranslationPipe} from '../../../i18n/user.translation';
import {CustomValidators} from '../../../../../shared/CustomValidators';
import {JuiceboxService} from '../../../../../shared/services/Juicebox.service';
import {SharedModule} from '../../../../../shared/shared.module';


@Component({
    selector: 'app-add-wallet-user',
    templateUrl: './add-wallet-user.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    ReactiveFormsModule,
    SharedModule,
    UserTranslationPipe
]
})
export class AddWalletUserComponent implements OnInit {

    public walletForm: FormGroup;
    public readonly publishers = signal<Array<any>>([]);

    id: any;

    public updatePromise = null;
    private i18n: UserTranslationPipe;

    private userService = inject(UsersService);
    private dialogRef = inject<DialogRef<any>>(DialogRef);
    public data = inject<{ id: any }>(DIALOG_DATA);
    public route = inject(ActivatedRoute);
    private juicebox = inject(JuiceboxService);
    public router = inject(Router);

    constructor() {
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
            const publishers = result?.payload?.publishers ?? [];
            this.publishers.set(publishers);
            if (publishers.length == 1) {
                this.walletForm.patchValue({ publisher: publishers[0].id });
            }
        })
    }
    create(): any {
        this.walletForm.markAllAsTouched();
        if (this.walletForm.invalid) return new Promise(resolve => setTimeout(resolve, 200));

        const { publisher, name, address, privateKey } = this.walletForm.value;

        this.updatePromise = (async () => {
            if (!privateKey){
                const result = await this.userService.createWallet(this.id, {
                    address,
                    name,
                    publisherId: publisher,
                    transferLock: 2
                });
                if (result.success) {
                    this.juicebox.showToast("success", this.i18n.transform(address ? 'wallet_added' : 'wallet_created'));
                    // true: the wallets tab reloads its list
                    this.dialogRef.close(true);
                    await this.router.navigateByUrl("/main/users/details/"+this.id+"/wallets-user");
                } else {
                    this.juicebox.showToast("error", this.i18n.transform(address ? 'wallet_add_failed' : 'wallet_create_failed'));
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
