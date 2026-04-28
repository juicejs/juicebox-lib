import { Component, Inject, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { UsersService } from '../../users.service';
import { JuiceboxService} from '../../../../shared/services/Juicebox.service';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../../shared/shared.module';

@Component({
    templateUrl: './login-as-another-user.component.html',
    styleUrls: ['./login-as-another-user.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        SharedModule
    ]
})
export class LoginAsAnotherUserComponent implements OnInit {

    user_id: string;

    promiseBtn: any;
    twoFaForm: FormGroup = new FormGroup({
        code: new FormControl('', [Validators.required, Validators.pattern('^[0-9]*$'),
            Validators.minLength(6), Validators.maxLength(6)]),
        organisation: new FormControl('', Validators.nullValidator)
    });

    organisations: any[] = [];

    constructor(private dialogRef: DialogRef<any>,
                @Inject(DIALOG_DATA) public data: { user_id: string },
                private userService: UsersService,
                private juicebox: JuiceboxService) {
        this.user_id = this.data.user_id;
    }

    async ngOnInit(): Promise<void> {
        await this.getUser();
    }

    private async getUser() {
        const user = await this.userService.getUser(this.user_id);
        if (!user.success) {
            this.juicebox.showToast("error", user.error);
            return this.close();
        }

        if (Object.keys(user.payload.roles)?.length < 2) {
            this.twoFaForm.controls['organisation'].setValue(Object.keys(user.payload.roles)[0]);
            return;
        }

        const orgs = []
        for (const org_id of Object.keys(user.payload.roles)) {
            const org = await this.juicebox.getOrganisation(org_id);
            orgs.push(org);
        }

        this.organisations = [...orgs];
    }

    async login() {
        this.promiseBtn = (async () => {
            const data = this.twoFaForm.value;
            const result = await this.juicebox.loginAsAnotherUser(this.user_id, data.code, data.organisation);
            if (!result.success) {
                this.juicebox.showToast('error', result.error);
                return;
            }

            this.dialogRef.close(result);
        })();
    }

    close() {
        this.dialogRef.close({ success: false });
    }

}
