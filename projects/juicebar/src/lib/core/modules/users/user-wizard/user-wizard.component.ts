import {Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterOutlet} from '@angular/router';
import { JuiceboxService} from '../../../shared/services/Juicebox.service';
import {MatTabsModule} from '@angular/material/tabs';
import {SharedModule} from '../../../shared/shared.module';
import {UserTranslationPipe} from '../i18n/user.translation';

@Component({
    selector: 'app-user-wizard',
    templateUrl: './user-wizard.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        RouterOutlet,
        MatTabsModule,
        SharedModule,
        UserTranslationPipe
    ]
})
export class UserWizardComponent implements OnInit {

    constructor(public juicebox: JuiceboxService) {
    }

    ngOnInit(): void {
    }

}
