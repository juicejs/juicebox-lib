import {Component, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterOutlet} from '@angular/router';
import {SharedModule} from '../../../shared/shared.module';
import {UserTranslationPipe} from '../i18n/user.translation';
import {TabsComponent, TabComponent} from "../../../../ui-components";
import {injectCustomUserTabs} from '../users-customization';

@Component({
    selector: 'app-user-wizard',
    templateUrl: './user-wizard.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        RouterOutlet,
        SharedModule,
        UserTranslationPipe,
        TabsComponent,
        TabComponent
    ]
})
export class UserWizardComponent {
    /** Steps after 'main' that the project added via componentOverrides (e.g. customers, allowed types) */
    protected readonly steps = injectCustomUserTabs(['user-wizard']);
}
