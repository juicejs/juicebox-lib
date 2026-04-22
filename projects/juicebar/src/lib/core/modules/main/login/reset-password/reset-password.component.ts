import {Component, OnDestroy, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {Subscription} from 'rxjs';
import {ActivatedRoute, Router} from '@angular/router';
import {AbstractControl, FormControl, FormGroup, ValidationErrors, Validators, ReactiveFormsModule} from '@angular/forms';
import {CustomValidators} from '../../../../shared/CustomValidators';
// import {UsersService} from '../../../users/users.service';
import {HelperService} from '../../../../shared/services/helper.service';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {GlobalTranslationPipe} from '../../../../i18n/global.translation';
import {CommonModule} from '@angular/common';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {SharedModule} from '../../../../shared/shared.module';

@Component({
    selector: 'app-reset-password',
    templateUrl: './reset-password.component.html',
    styleUrls: ['./reset-password.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        SharedModule,
        GlobalTranslationPipe
    ]
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
    public subscription$: Subscription = new Subscription();
    public resetPasswordForm: FormGroup;
    public token;
    public promiseBtn: any;
    minLength = 8;

    randomPassword: string;
    private static passwordValidatorRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*#?&:{}<>+-_()|~]{8,64}$/;

    i18n: GlobalTranslationPipe;

    constructor(private route: ActivatedRoute,
                // private usersService: UsersService,
                private juicebox: JuiceboxService,
                private helper: HelperService,
                private router: Router) {
      this.i18n = new GlobalTranslationPipe(this.juicebox);
    }

    private static customPassword(control: AbstractControl): ValidationErrors | null {
        const regex = ResetPasswordComponent.passwordValidatorRegex;
        return (typeof control.value === 'string' && regex.test(control.value)) ? null : { 'password': true };
    }

    ngOnInit() {
      // @ts-ignore
      this.subscription$ = this.route.queryParams.subscribe(async params => {
            this.token = params['token'];
            // if (!this.token) {
            //     this.juicebox.showToast("error", 'Invalid token');
            //     await this.router.navigateByUrl('/');
            //     return false;
            // }

            // const result = await this.usersService.isForgotPasswordTokenValid(this.token);
            // if (!result.success) {
            //     this.juicebox.showToast("error", 'Invalid token');
            //     await this.router.navigateByUrl('/');
            //     return false;
            // }
        });

        this.resetPasswordForm = new FormGroup({
            password: new FormControl(null, [Validators.required, ResetPasswordComponent.customPassword]),
            repeatPassword: new FormControl(null, [Validators.required, ResetPasswordComponent.customPassword])
        }, CustomValidators.passwordMatch);

    }

    ngOnDestroy(): void {
        this.subscription$.unsubscribe();
    }

    async resetPassword(): Promise<any> {
        this.resetPasswordForm.markAllAsTouched();
        if (this.resetPasswordForm.invalid) {
            return false;
        }

        this.promiseBtn = (async () => {
            // const sendResetEmail = await this.usersService.resetPassword(this.resetPasswordForm.value.password, this.resetPasswordForm.value.repeatPassword, this.token);
            // if (!sendResetEmail.success) {
            //     this.juicebox.showToast("error", sendResetEmail.error);
            //     await this.helper.pause();
            //     await this.router.navigateByUrl('/');
            //     return false;
            //
            // }
            this.juicebox.showToast("success", this.i18n.transform('password_changed'));
            await this.helper.pause();
            await this.router.navigateByUrl('/');
            return true;
        })();
    }

    generateRandomPassword() {
        this.randomPassword = this.helper.generateRandomPassword();
        this.resetPasswordForm.controls['password'].patchValue(this.randomPassword);
        this.resetPasswordForm.controls['repeatPassword'].patchValue(this.randomPassword);
    }
}
