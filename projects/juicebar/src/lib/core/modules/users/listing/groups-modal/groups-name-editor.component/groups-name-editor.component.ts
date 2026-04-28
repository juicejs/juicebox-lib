import {Component, Inject, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormControl, FormGroup, Validators, ReactiveFormsModule} from '@angular/forms';
import {DialogRef, DIALOG_DATA} from '@angular/cdk/dialog';
import {UsersService} from '../../../users.service';
import {UserTranslationPipe} from '../../../i18n/user.translation';
import {JuiceboxService} from '../../../../../shared/services/Juicebox.service';
import {SharedModule} from '../../../../../shared/shared.module';
import {SnackbarService} from '../../../../../../ui-components';

@Component({
    selector: 'app-groups-name-editor',
    templateUrl: './groups-name-editor.component.html',
    styleUrls: ['./groups-name-editor.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        SharedModule,
        UserTranslationPipe
    ]
})
export class GroupsNameEditorComponent implements OnInit {

    group: any;

    groupForm: FormGroup;
    promiseBtn: any;

    enable: boolean = false;

    constructor(private dialogRef: DialogRef<any>,
                @Inject(DIALOG_DATA) public data: { group?: any },
                private userService: UsersService,
                private snackbar: SnackbarService,
                private pipe: UserTranslationPipe,
                public juicebox: JuiceboxService) {
        this.group = this.data?.group;
    }

    createGroupForm(): FormGroup {
        return new FormGroup({
            name: new FormControl(this.group ? this.group.name : '', Validators.required),
            key: new FormControl(this.group && this.group.key ? this.group.key.split(':')[1] : '', Validators.required),
            superAdmin: new FormControl('', Validators.nullValidator)
        })
    }

    ngOnInit() {
        this.groupForm = this.createGroupForm();
        this.enable = this.group && this.group.options && this.group.options.superAdmin ? this.group.options.superAdmin : false;
    }

    submit() {
        const data = this.groupForm.value;
        this.promiseBtn = (async (): Promise<any> => {
            let result;
            //Create new group
            if (!this.group) {
                result = await this.userService.createGroup(data);
                if (!result.success) {
                    this.snackbar.open(`Error: ${result.error}`, 'error');
                    return false;
                }
                this.snackbar.open(`Success: ${this.pipe.transform('successfully_created')} "${data.name}"`, 'success');
            }
            //Update existing group
            else {
                const updateData = this.group;
                updateData.name = data.name;
                updateData.superAdmin = this.enable;
                result = await this.userService.updateGroup(updateData);
                if (!result.success) {
                    this.snackbar.open(`Error: ${result.error}`, 'error');
                    return false;
                }
                this.snackbar.open(`Success: ${this.pipe.transform('successfully_updated')} "${data.name}"`, 'success');
            }

            this.dialogRef.close({ success: true });
        })();
    }

    close() {
        this.dialogRef.close({ success: false });
    }

}
