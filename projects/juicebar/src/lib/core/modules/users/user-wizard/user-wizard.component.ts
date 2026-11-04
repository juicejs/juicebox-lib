import {Component, ChangeDetectionStrategy, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute, NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {filter, map, startWith} from 'rxjs/operators';
import {SHARED_IMPORTS} from '../../../shared/shared-imports';
import {UserTranslationPipe} from '../i18n/user.translation';
import {TabsComponent, TabComponent} from "../../../../ui-components";
import {injectCustomUserTabs} from '../users-customization';

@Component({
    selector: 'app-user-wizard',
    templateUrl: './user-wizard.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    RouterOutlet,
    SHARED_IMPORTS,
    UserTranslationPipe,
    TabsComponent,
    TabComponent
]
})
export class UserWizardComponent {
    /** Steps after 'main' that the project added via componentOverrides (e.g. customers, allowed types) */
    protected readonly steps = injectCustomUserTabs(['user-wizard']);

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    /** The current step's tab is highlighted, as routerLinkActive did in the old wizard */
    protected readonly selectedIndex = toSignal(
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            startWith(null),
            map(() => this.currentStepIndex())
        ),
        { initialValue: 0 }
    );

    private currentStepIndex(): number {
        const segment = this.route.snapshot.firstChild?.url[0]?.path;
        return Math.max(['main', ...this.steps.map(step => step.route)].indexOf(segment), 0);
    }
}
