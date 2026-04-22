import {Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {FormControl, FormGroup, Validators, ReactiveFormsModule} from '@angular/forms';

// import {UsersService} from '../../../users/users.service';
import {HelperService} from '../../../../shared/services/helper.service';
import {MatDialogRef, MatDialogModule} from '@angular/material/dialog';
import {GlobalTranslationPipe} from '../../../../i18n/global.translation';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {CommonModule} from '@angular/common';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {SharedModule} from '../../../../shared/shared.module';

@Component({
    selector: 'app-forgot-password',
    templateUrl: './forgot-password.component.html',
    styleUrls: ['./forgot-password.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        SharedModule,
        GlobalTranslationPipe
    ]
})
export class ForgotPasswordComponent implements OnInit {

    public forgotPasswordForm: FormGroup;
    public promiseBtn: any;

    i18n: GlobalTranslationPipe;

    constructor(private juicebox: JuiceboxService,
                // private userService: UsersService,
                public dialogRef: MatDialogRef<ForgotPasswordComponent>,
                private helper: HelperService) {
      this.i18n = new GlobalTranslationPipe(this.juicebox)

    }

    ngOnInit() {
        this.forgotPasswordForm = new FormGroup({
            email: new FormControl(null, [Validators.required, Validators.email])
        });
    }

    async forgotPassword(): Promise<any> {
        this.forgotPasswordForm.markAllAsTouched();
        if (this.forgotPasswordForm.invalid) return false;

        this.promiseBtn = (async () => {
            // const sendResetEmail = await this.userService.forgotPassword(this.forgotPasswordForm.value.email, window.location.protocol + '//' + window.location.host);
            // if (!sendResetEmail.success) {
            //     this.juicebox.showToast("error", sendResetEmail.error);
            //     await this.helper.pause();
            //     this.dialogRef.close();
            //     return false;
            // }
            this.juicebox.showToast("success", this.i18n.transform('reset_email_sent'));
            await this.helper.pause();
            this.dialogRef.close();
            return true;
        })();
    }
}
