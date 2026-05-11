import {Component, OnInit, ChangeDetectionStrategy, inject} from '@angular/core';
import {FormControl, FormGroup, Validators, ReactiveFormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {HelperService} from '../../../../shared/services/helper.service';
import {GlobalTranslationPipe} from '../../../../i18n/global.translation';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {SharedModule} from '../../../../shared/shared.module';
import {DialogRef} from '@angular/cdk/dialog';
import {
    ButtonComponent,
    FormFieldComponent,
    LabelComponent,
    ErrorComponent,
    InputDirective,
    DialogContentComponent,
    DialogActionsComponent
} from '../../../../../ui-components';

@Component({
    selector: 'app-forgot-password',
    templateUrl: './forgot-password.component.html',
    styleUrl: './forgot-password.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        SharedModule,
        GlobalTranslationPipe,
        ButtonComponent,
        FormFieldComponent,
        LabelComponent,
        ErrorComponent,
        InputDirective,
        DialogContentComponent,
        DialogActionsComponent
    ]
})
export class ForgotPasswordComponent implements OnInit {

    public forgotPasswordForm: FormGroup;
    public promiseBtn: any;

    public dialogRef = inject<DialogRef<unknown>>(DialogRef);
    private juicebox = inject(JuiceboxService);
    private helper = inject(HelperService);

    i18n: GlobalTranslationPipe = new GlobalTranslationPipe(this.juicebox);

    ngOnInit() {
        this.forgotPasswordForm = new FormGroup({
            email: new FormControl(null, [Validators.required, Validators.email])
        });
    }

    async forgotPassword(): Promise<any> {
        this.forgotPasswordForm.markAllAsTouched();
        if (this.forgotPasswordForm.invalid) return false;

        this.promiseBtn = (async () => {
            this.juicebox.showToast("success", this.i18n.transform('reset_email_sent'));
            await this.helper.pause();
            this.dialogRef.close();
            return true;
        })();
    }
}
