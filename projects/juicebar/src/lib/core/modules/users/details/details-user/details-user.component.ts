import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { UsersService } from '../../users.service';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, Validators, ReactiveFormsModule } from '@angular/forms';
import { UserTranslationPipe } from '../../i18n/user.translation';
import { CustomValidators} from '../../../../shared/CustomValidators';
import { HelperService} from '../../../../shared/services/helper.service';
import { JuiceboxService} from '../../../../shared/services/Juicebox.service';
import { ConfirmationDialogComponent} from '../../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { DialogService } from '../../../../../ui-components';
import { SharedModule } from '../../../../shared/shared.module';

@Component({
    selector: 'app-details-user',
    templateUrl: './details-user.component.html',
    styleUrls: ['./details-user.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        SharedModule,
        UserTranslationPipe
    ]
})
export class DetailsUserComponent implements OnInit {

    protected readonly user = signal<any>(null);
    protected readonly userForm = signal<FormGroup | null>(null);
    protected readonly passwordForm = signal<FormGroup | null>(null);
    protected readonly walletCtrl = new FormControl<string>('');
    protected readonly updatePromise = signal<Promise<any> | null>(null);
    protected readonly randomPassword = signal('');
    protected readonly projectTitle = signal('');
    protected readonly languages = signal<any[]>([]);

    private static passwordValidatorRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*#?&:{}<>+-_()|~]{8,64}$/;
    public minLength = 8;

    private route = inject(ActivatedRoute);
    private userService = inject(UsersService);
    private helper = inject(HelperService);
    public juicebox = inject(JuiceboxService);
    private dialog = inject(DialogService);
    private userPipe = inject(UserTranslationPipe);

    private static customPassword(control: AbstractControl): ValidationErrors | null {
        const regex = DetailsUserComponent.passwordValidatorRegex;
        return (typeof control.value === 'string' && regex.test(control.value)) ? null : { 'password': true };
    }

    async ngOnInit() {
        const id = this.route.parent.snapshot.params['id'];
        const result = await this.userService.getUser(id);
        const userData = result.payload;

        this.user.set(userData);
        this.walletCtrl.setValue(userData.wallet ?? '');

        this.userForm.set(new FormGroup({
            salutation: new FormControl(userData.salutation ?? null),
            firstname: new FormControl(userData.firstname ?? null, Validators.required),
            lastname: new FormControl(userData.lastname ?? null, Validators.required),
            email: new FormControl(userData.email ?? null, [Validators.email, Validators.required]),
            nickname: new FormControl(userData.nickname ?? null, Validators.nullValidator),
            department: new FormControl(userData.department ?? null),
            language: new FormControl(userData.attributes?.settings?.language ?? null),
            active: new FormControl(userData.active ?? null),
            admin: new FormControl(userData.attributes?.admin ?? null),
        }));

        this.passwordForm.set(new FormGroup({
            password: new FormControl('', [Validators.required, DetailsUserComponent.customPassword]),
            repeatPassword: new FormControl('', [Validators.required, DetailsUserComponent.customPassword])
        }, CustomValidators.passwordMatch));

        this.projectTitle.set(this.juicebox.getProjectTitle());
        this.languages.set(this.juicebox.getOptions()?.languages.map(l => ({
            code: l.code,
            name: this.userPipe.transform(l.name)
        })));

        this.userForm().markAsPristine();

        this.juicebox.navigationEvent({
            location: this.userPipe.transform('users'),
            subject: userData.email + ' - ' + this.userPipe.transform('details'),
            link: '/main/users'
        });
    }

    change() {
        const form = this.userForm();
        form.markAllAsTouched();
        if (form.invalid) return;

        this.updatePromise.set((async () => {
            const result = await this.userService.updateUser(this.user()._id, form.value);
            if (result.success) {
                form.markAsPristine();
                this.juicebox.showToast('success', this.userPipe.transform('user_profile_updated'));
            } else {
                this.juicebox.showToast('error', this.userPipe.transform(result.error));
            }
        })());
    }

    async changePassword() {
        const form = this.passwordForm();
        if (form.invalid) return;

        this.updatePromise.set((async () => {
            const result = await this.userService.updatePassword(this.user()._id, form.value.password);
            if (result.success) {
                this.juicebox.showToast('success', this.userPipe.transform('password_changed'));
                form.markAsPristine();
                this.randomPassword.set('');
                form.controls['password'].setValue('');
                form.controls['repeatPassword'].setValue('');
                form.markAsUntouched();
                return;
            }
            if (!result.success && result.error) {
                this.juicebox.showToast('error', this.userPipe.transform(result.error));
            }
        })());
    }

    generateRandomPassword() {
        const pwd = this.helper.generateRandomPassword();
        this.randomPassword.set(pwd);
        this.passwordForm().controls['password'].patchValue(pwd);
        this.passwordForm().controls['repeatPassword'].patchValue(pwd);
    }

    resetTwoFactor() {
        const currentUser = this.user();
        if (!currentUser?.attributes?.settings?.twoFactor && this.juicebox.hasPermission('users:role#super-admin')) {
            return;
        }

        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            data: { action: 'reset', subject: 'User two factor' }
        });
        dialogRef.closed.subscribe(async (dialogResult) => {
            if (!dialogResult) return;
            const result = await this.userService.resetTwoFactor(currentUser._id);
            if (!result?.success) {
                this.juicebox.showToast('error', result.error);
                return;
            }
            const updated = await this.userService.getUser(currentUser._id);
            this.user.set(updated.payload);
        });
    }

    async setWalletAddress() {
        await this.userService.updateUser(this.user()._id, {
            wallet: this.walletCtrl.value
        });
    }
}
