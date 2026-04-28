import {Component, OnDestroy, OnInit, ChangeDetectionStrategy, inject} from '@angular/core';
import {Subscription} from 'rxjs';
import {ActivatedRoute, Router} from '@angular/router';
import {AbstractControl, FormControl, FormGroup, ValidationErrors, Validators, ReactiveFormsModule} from '@angular/forms';
import {CustomValidators} from '../../../../shared/CustomValidators';
import {HelperService} from '../../../../shared/services/helper.service';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {GlobalTranslationPipe} from '../../../../i18n/global.translation';
import {CommonModule} from '@angular/common';
import {SharedModule} from '../../../../shared/shared.module';
import {ButtonComponent} from '../../../../../ui-components';

@Component({
    selector: 'app-reset-password',
    templateUrl: './reset-password.component.html',
    styleUrls: ['./reset-password.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        SharedModule,
        GlobalTranslationPipe,
        ButtonComponent
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

    private route = inject(ActivatedRoute);
    private juicebox = inject(JuiceboxService);
    private helper = inject(HelperService);
    private router = inject(Router);

    i18n: GlobalTranslationPipe = new GlobalTranslationPipe(this.juicebox);

    private static customPassword(control: AbstractControl): ValidationErrors | null {
        const regex = ResetPasswordComponent.passwordValidatorRegex;
        return (typeof control.value === 'string' && regex.test(control.value)) ? null : { 'password': true };
    }

    ngOnInit() {
      // @ts-ignore
      this.subscription$ = this.route.queryParams.subscribe(async params => {
            this.token = params['token'];
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
