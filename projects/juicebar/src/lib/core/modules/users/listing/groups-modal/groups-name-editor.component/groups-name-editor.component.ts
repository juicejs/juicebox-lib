import {Component, Inject, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormControl, FormGroup, Validators, ReactiveFormsModule} from '@angular/forms';
import {MatDialogRef, MAT_DIALOG_DATA, MatDialogModule} from '@angular/material/dialog';
import {UsersService} from '../../../users.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {UserTranslationPipe} from '../../../i18n/user.translation';
import {JuiceboxService} from '../../../../../shared/services/Juicebox.service';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {SharedModule} from '../../../../../shared/shared.module';

@Component({
    selector: 'app-groups-name-editor',
    templateUrl: './groups-name-editor.component.html',
    styleUrls: ['./groups-name-editor.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatCheckboxModule,
        SharedModule,
        UserTranslationPipe
    ]
})
export class GroupsNameEditorComponent implements OnInit {

    group: any;

    groupForm: FormGroup;
    promiseBtn: any;

    enable: boolean = false;

    constructor(private dialogRef: MatDialogRef<GroupsNameEditorComponent>,
                @Inject(MAT_DIALOG_DATA) public data: { group?: any },
                private userService: UsersService,
                private snackBar: MatSnackBar,
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
                    this.snackBar.open(`Error: ${result.error}`, '', {
                        duration: 5000,
                        panelClass: ['error-snackbar']
                    });
                    return false;
                }
                this.snackBar.open(`Success: ${this.pipe.transform('successfully_created')} "${data.name}"`, '', {
                    duration: 1000,
                    panelClass: ['success-snackbar']
                });
            }
            //Update existing group
            else {
                const updateData = this.group;
                updateData.name = data.name;
                updateData.superAdmin = this.enable;
                result = await this.userService.updateGroup(updateData);
                if (!result.success) {
                    this.snackBar.open(`Error: ${result.error}`, '', {
                        duration: 5000,
                        panelClass: ['error-snackbar']
                    });
                    return false;
                }
                this.snackBar.open(`Success: ${this.pipe.transform('successfully_updated')} "${data.name}"`, '', {
                    duration: 1000,
                    panelClass: ['success-snackbar']
                });
            }

            this.dialogRef.close({ success: true });
        })();
    }

    close() {
        this.dialogRef.close({ success: false });
    }

}
