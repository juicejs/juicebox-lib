import {Component, inject, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {FormControl, FormGroup, Validators, ReactiveFormsModule} from '@angular/forms';
import {DialogRef, DIALOG_DATA} from '@angular/cdk/dialog';
import {UsersService} from '../../../users.service';
import {UserTranslationPipe} from '../../../i18n/user.translation';
import {JuiceboxService} from '../../../../../shared/services/Juicebox.service';
import {SHARED_IMPORTS} from '../../../../../shared/shared-imports';

@Component({
    selector: 'app-groups-name-editor',
    templateUrl: './groups-name-editor.component.html',
    styleUrls: ['./groups-name-editor.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    ReactiveFormsModule,
    SHARED_IMPORTS,
    UserTranslationPipe
]
})
export class GroupsNameEditorComponent implements OnInit {

    group: any;

    groupForm: FormGroup;
    promiseBtn: any;


    private dialogRef = inject<DialogRef<any>>(DialogRef);
    public data = inject<{ group?: any }>(DIALOG_DATA);
    private userService = inject(UsersService);
    private pipe = inject(UserTranslationPipe);
    public juicebox = inject(JuiceboxService);

    constructor() {
        this.group = this.data?.group;
    }

    createGroupForm(): FormGroup {
        return new FormGroup({
            name: new FormControl(this.group ? this.group.name : '', Validators.required),
            key: new FormControl(this.group && this.group.key ? this.group.key.split(':')[1] : '', Validators.required),
            superAdmin: new FormControl(this.group?.options?.superAdmin ?? false)
        })
    }

    ngOnInit() {
        this.groupForm = this.createGroupForm();
    }

    submit() {
        const data = this.groupForm.value;
        this.promiseBtn = (async (): Promise<any> => {
            let result;
            //Create new group
            if (!this.group) {
                result = await this.userService.createGroup(data);
                if (!result.success) {
                    this.juicebox.showToast('error', result.error);
                    return false;
                }
                this.juicebox.showToast('success', this.pipe.transform('success'), `${this.pipe.transform('successfully_created')} "${data.name}"`, { timeOut: 1000 });
            }
            //Update existing group
            else {
                const updateData = this.group;
                updateData.name = data.name;
                updateData.superAdmin = !!this.groupForm.controls['superAdmin'].value;
                result = await this.userService.updateGroup(updateData);
                if (!result.success) {
                    this.juicebox.showToast('error', result.error);
                    return false;
                }
                this.juicebox.showToast('success', this.pipe.transform('success'), `${this.pipe.transform('successfully_updated')} "${data.name}"`, { timeOut: 1000 });
            }

            this.dialogRef.close({ success: true });
        })();
    }

    close() {
        this.dialogRef.close({ success: false });
    }

}
