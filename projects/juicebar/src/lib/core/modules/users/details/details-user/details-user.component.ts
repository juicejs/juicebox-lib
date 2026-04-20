import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UsersService } from '../../users.service';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { UserTranslationPipe } from '../../i18n/user.translation';
import { CustomValidators} from '../../../../shared/CustomValidators';
import { HelperService} from '../../../../shared/services/helper.service';
import { JuiceboxService} from '../../../../shared/services/Juicebox.service';
import { ConfirmationDialogComponent} from '../../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
    selector: 'app-details-user',
    templateUrl: './details-user.component.html',
    styleUrls: ['./details-user.component.css']
})
export class DetailsUserComponent implements OnInit {

    public user: any;
    public userForm: FormGroup;
    public passwordForm: FormGroup;

    public i18n: UserTranslationPipe;
    public updatePromise = null;

    private static passwordValidatorRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*#?&:{}<>+-_()|~]{8,64}$/;

    public minLength = 8;
    randomPassword: string = '';

    projectTitle: string = '';

    languages: any[] = [];
    emailReminders = [
        {
            value: true,
            label: "Yes"
        },
        {
            value: false,
            label: "No"
        }
    ]

    constructor(private route: ActivatedRoute,
                private userService: UsersService,
                private helper: HelperService,
                public juicebox: JuiceboxService,
                private dialog: MatDialog,
                private userPipe: UserTranslationPipe) {
      this.i18n = new UserTranslationPipe(this.juicebox)
    }

    /**
     * Validate password
     * @param control
     */
    private static customPassword(control: AbstractControl): ValidationErrors | null {
        const regex = DetailsUserComponent.passwordValidatorRegex;
        return (typeof control.value === 'string' && regex.test(control.value)) ? null : { 'password': true };
    }

    async ngOnInit() {
        const id = this.route.parent.snapshot.params['id'];
        const result = await this.userService.getUser(id);
        this.user = result.payload;

        this.userForm = new FormGroup({
            salutation: new FormControl(this.user.salutation ?? null),
            firstname: new FormControl(this.user.firstname ?? null, Validators.required),
            lastname: new FormControl(this.user.lastname ?? null, Validators.required),
            email: new FormControl(this.user.email ?? null, [Validators.email, Validators.required]),
            nickname: new FormControl(this.user.nickname ?? null, Validators.nullValidator),
            department: new FormControl(this.user.department ?? null),
            language: new FormControl(this.user.attributes?.settings?.language ?? null),
            active: new FormControl(this.user.active ?? null),
            admin: new FormControl(this.user.attributes?.admin ?? null),
        });

        this.passwordForm = new FormGroup({
            password: new FormControl('', [Validators.required, DetailsUserComponent.customPassword]),
            repeatPassword: new FormControl('', [Validators.required, DetailsUserComponent.customPassword])
        }, CustomValidators.passwordMatch);

        this.projectTitle = this.juicebox.getProjectTitle();
        this.languages = this.juicebox.getOptions()?.languages.map(l => {
            return {
                code: l.code,
                name: this.userPipe.transform(l.name)
            };
        });

        this.userForm.markAsPristine()

        this.juicebox.navigationEvent({
            location: this.i18n.transform('users'),
            subject: result.payload.email + ' - ' + this.i18n.transform('details'),
            link: '/main/users'
        });
    }

    change() {
        this.userForm.markAllAsTouched();
        if (this.userForm.invalid) {
            return;
        }

        this.updatePromise = (async () => {
            const result = await this.userService.updateUser(this.user._id, this.userForm.value);
            if (result.success) {
                this.userForm.markAsPristine();
                this.juicebox.showToast('success', this.i18n.transform('user_profile_updated'));
            } else {
                this.juicebox.showToast('error', this.i18n.transform(result.error));
            }
        })();
    }

    async changePassword() {
        if (this.passwordForm.invalid) {
            return;
        }

        const data = this.passwordForm.value;

        this.updatePromise = (async () => {
            const result = await this.userService.updatePassword(this.user._id, data.password);
            if (result.success) {
                this.juicebox.showToast('success', this.i18n.transform('password_changed'));
                this.passwordForm.markAsPristine();
                this.randomPassword = '';
                this.passwordForm.controls['password'].setValue('');
                this.passwordForm.controls['repeatPassword'].setValue('');
                this.passwordForm.markAsUntouched();
                return;
            }
            if (!result.success && result.error) {
                this.juicebox.showToast('error', this.i18n.transform(result.error));
            }
        })();
    }

    generateRandomPassword() {
        this.randomPassword = this.helper.generateRandomPassword();
        this.passwordForm.controls['password'].patchValue(this.randomPassword);
        this.passwordForm.controls['repeatPassword'].patchValue(this.randomPassword);
    }

    resetTwoFactor() {
        if (!this.user?.attributes?.settings?.twoFactor && this.juicebox.hasPermission('users:role#super-admin')) {
            return;
        }

        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            data: {
                action: 'reset',
                subject: 'User two factor'
            }
        });
        dialogRef.afterClosed().subscribe(async (dialogResult) => {
            if (!dialogResult) return;
            const result = await this.userService.resetTwoFactor(this.user._id);
            if (!result?.success) {
                this.juicebox.showToast('error', result.error);
                return;
            }

            const user = await this.userService.getUser(this.user._id);
            this.user = user.payload;
        });
    }

    async setWalletAddress(){
        await this.userService.updateUser(this.user._id, {
            "wallet": this.user.wallet
        });
    }

}
