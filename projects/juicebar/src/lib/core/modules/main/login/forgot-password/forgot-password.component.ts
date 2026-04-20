import {Component, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';

// import {UsersService} from '../../../users/users.service';
import {HelperService} from '../../../../shared/services/helper.service';
import {MatDialogRef} from '@angular/material/dialog';
import {GlobalTranslationPipe} from '../../../../i18n/global.translation';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';

@Component({
    selector: 'app-forgot-password',
    templateUrl: './forgot-password.component.html',
    styleUrls: ['./forgot-password.component.css']
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
