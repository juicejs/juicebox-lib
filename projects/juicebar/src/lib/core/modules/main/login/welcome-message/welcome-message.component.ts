import {Component, Inject, input, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA, MatDialogModule} from '@angular/material/dialog';
import {CommonModule} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';

export interface WelcomeMessageData {
  message: string;
}

@Component({
    selector: 'app-welcome-message',
    templateUrl: './welcome-message.component.html',
    styleUrls: ['./welcome-message.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule
    ]
})
export class WelcomeMessageComponent implements OnInit {

    public message = input<string>();

    constructor(
        public dialogRef: MatDialogRef<WelcomeMessageComponent>,
        @Inject(MAT_DIALOG_DATA) public data: WelcomeMessageData
    ) {
    }

    ngOnInit() {

    }

}
