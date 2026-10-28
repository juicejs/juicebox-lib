import {Component, input, OnInit, ChangeDetectionStrategy, inject} from '@angular/core';
import {DialogRef, DIALOG_DATA} from '@angular/cdk/dialog';
import {ButtonComponent, DialogContentComponent, DialogActionsComponent} from '../../../../../ui-components';

export interface WelcomeMessageData {
  message: string;
}

@Component({
    selector: 'app-welcome-message',
    templateUrl: './welcome-message.component.html',
    styleUrls: ['./welcome-message.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    ButtonComponent,
    DialogContentComponent,
    DialogActionsComponent
]
})
export class WelcomeMessageComponent implements OnInit {

    public message = input<string>();

    public dialogRef = inject<DialogRef<boolean>>(DialogRef);
    public data = inject<WelcomeMessageData>(DIALOG_DATA, { optional: true });

    ngOnInit() {}
}
