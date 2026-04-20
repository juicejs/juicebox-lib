import {Component, Inject, Input, OnInit} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';

export interface WelcomeMessageData {
  message: string;
}

@Component({
    selector: 'app-welcome-message',
    templateUrl: './welcome-message.component.html',
    styleUrls: ['./welcome-message.component.scss']
})
export class WelcomeMessageComponent implements OnInit {

    @Input() public message: string;

    constructor(
        public dialogRef: MatDialogRef<WelcomeMessageComponent>,
        @Inject(MAT_DIALOG_DATA) public data: WelcomeMessageData
    ) {
    }

    ngOnInit() {

    }

}
