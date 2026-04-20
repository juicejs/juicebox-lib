import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {JuiceboxService} from '../../services/Juicebox.service';
import { SharedTranslationPipe} from '../../i18n/shared-translation.pipe';

export interface ConfirmationDialogData {
  action?: string;
  message?: string;
  completeMessage?: string;
  subject?: string;
  info?: string;
  excludeQuestionMark?: boolean;
  title?: string;
  cancel?: string;
  confirm?: string;
}

@Component({
    selector: 'app-confirmation-dialog',
    templateUrl: './confirmation-dialog.component.html',
    styleUrls: ['./confirmation-dialog.component.css']
})
export class ConfirmationDialogComponent implements OnInit {

    public action: string;
    public message: string;
    public completeMessage: string;
    public subject: string;
    public info: string;
    public excludeQuestionMark: boolean;
    public title: string;
    public cancel: string = 'cancel';
    public confirm: string = 'ok';
    public i18n: SharedTranslationPipe;

    constructor(
        protected juicebox: JuiceboxService,
        public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: ConfirmationDialogData
    ) {
        // Set properties from injected data
        this.action = data.action;
        this.message = data.message;
        this.completeMessage = data.completeMessage;
        this.subject = data.subject;
        this.info = data.info;
        this.excludeQuestionMark = data.excludeQuestionMark;
        this.title = data.title;
        this.cancel = data.cancel || 'cancel';
        this.confirm = data.confirm || 'ok';
        
        // Initialize i18n pipe
        this.i18n = new SharedTranslationPipe(this.juicebox);
    }

    ngOnInit() {
    }

}
