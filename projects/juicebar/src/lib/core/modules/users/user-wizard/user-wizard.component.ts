import {Component, inject, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterOutlet} from '@angular/router';
import { JuiceboxService} from '../../../shared/services/Juicebox.service';
import {SharedModule} from '../../../shared/shared.module';
import {UserTranslationPipe} from '../i18n/user.translation';
import {TabsComponent, TabComponent} from "../../../../ui-components";

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
export class UserWizardComponent implements OnInit {
    public juicebox = inject(JuiceboxService);

    ngOnInit(): void {
    }

}
