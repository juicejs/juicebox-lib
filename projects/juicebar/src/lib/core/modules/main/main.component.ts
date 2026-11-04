import { Title } from '@angular/platform-browser';
import { NavigationEnd, NavigationStart, Router, RouterEvent, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { JuiceboxService} from '../../shared/services/Juicebox.service';
import { SocketService} from '../../shared/services/socket.service';
import { isNumber} from '../../shared/util';
import {OnInit, Component, ViewEncapsulation, signal, Signal, ChangeDetectionStrategy, inject} from '@angular/core';
import {Subscription} from 'rxjs';
import {SidebarService} from '../../shared/services/sidebar.service';
import {toSignal} from '@angular/core/rxjs-interop';
import {NavigationComponent} from './navigation/navigation.component';
import {SidebarComponent} from './sidebar/sidebar.component';
import {SHARED_IMPORTS} from '../../shared/shared-imports';
import {GlobalTranslationPipe} from '../../i18n/global.translation';
import {ButtonComponent, IconComponent} from '../../../ui-components';
import {ConnectedPosition, OverlayModule} from '@angular/cdk/overlay';
import {MainTranslationPipe} from './i18n/main.translation';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GlobalTranslationPipe],
  imports: [
    RouterOutlet,
    NavigationComponent,
    SidebarComponent,
    SHARED_IMPORTS,
    ButtonComponent,
    IconComponent,
    OverlayModule
]
})
export class MainComponent implements OnInit {

    public locationLink = signal<any>(null);
    public locationTitle = signal<any>(null);
    public locationSubject = signal<any>(null);
    public breadcrumps = signal<Array<any>>(null);
    public text = signal<string>(null);
    public module = signal<string>(null);
    public navigationVisible!: Signal<boolean>;

    private subscription$: Subscription = new Subscription();

    private titleService = inject(Title);
    private router = inject(Router);
    public juicebox = inject(JuiceboxService);
    public socketService = inject(SocketService);
    public sidebarService = inject(SidebarService);
    private globalPipe = inject(GlobalTranslationPipe);
    protected readonly backLabel = this.globalPipe.transform('back');

    /** The module's help text, opened from the "?" next to the page's actions (ngbPopover in the old app) */
    protected readonly helpOpen = signal(false);
    protected readonly helpLabel = new MainTranslationPipe(this.juicebox).transform('help');
    protected readonly helpPositions: ConnectedPosition[] = [
        { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center', offsetX: -8 },
        { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
    ];

    constructor() {
        this.navigationVisible = toSignal(this.sidebarService.navigationVisible$, { initialValue: true });

        this.juicebox.actionButtons.set([]);
        this.juicebox.searchResults.set([]);

        this.router.events.subscribe(async event => {
            if(event instanceof NavigationEnd) {
                const url = (event as any).urlAfterRedirects ?? event.url;
                const splitUrl = url.split('/');
                const currentModule = splitUrl[2];
                if(currentModule != this.module()) {
                    this.helpOpen.set(false);
                    await this.getHelpText();
                }
                this.module.set(currentModule);
                this.resolvePageHeader(url);
            }
        })

        this.setTitle()
        this.verifyConnection();
        this.socketService.connect();

        // @ts-ignore
        this.router.events.pipe(filter((e: Event): e is RouterEvent => e instanceof NavigationStart)
        ).subscribe((e) => {
            this.juicebox.actionButtons.set([]);
        });

        this.subscription$ = this.juicebox.navigationEvent$.subscribe(event => {
            const e = (event ?? {}) as any;
            this.locationTitle.set(e.location);
            this.breadcrumps.set(e.breadcrumps);
            this.locationSubject.set(e.subject);
            this.locationLink.set(e.link);
        });

        if (localStorage.getItem("2fawarning")){
            this.juicebox.showToast("warning", "2FA", localStorage.getItem("2fawarning"),{
                disableTimeOut: true
            } );
            localStorage.removeItem("2fawarning");
        }
    }

    async ngOnInit() {
        const url = this.router.url.split('?')[0].replace(/\/$/, '');
        if (url === '/main') {
            // A user without roles, or without any module to open, is logged out
            // (a sidebar that couldn't be loaded is not a reason to)
            if (!this.juicebox.getUser()?.roles?.length) {
                this.juicebox.logout();
                return;
            }
            const route = await this.sidebarService.getFirstAccessibleRoute();
            if (route) {
                await this.router.navigateByUrl('/main/' + route);
            } else if (route === null) {
                this.juicebox.logout();
            }
        }
    }

    private setTitle() {
        const options = this.juicebox.getOptions();
        if (options && options.title) {
            this.titleService.setTitle(options.title);
        }
    }

    public async goTo(url: string) {
        await this.router.navigateByUrl(url);
    }

    private resolvePageHeader(url: string) {
        const current = this.juicebox.pageHeader();
        if (current?.scope && url.startsWith(current.scope)) return;

        const segment = url.split('/')[2]?.split('?')[0];
        if (!segment) {
            this.juicebox.setPageHeader(null);
            return;
        }
        const translated = this.globalPipe.transform(segment);
        const title = (typeof translated === 'string' && !translated.startsWith('@'))
            ? translated
            : segment.charAt(0).toUpperCase() + segment.slice(1);
        this.juicebox.setPageHeader({ title });
    }

    private verifyConnection(): void {
        const options = this.juicebox.getOptions();
        if (options && options.polling_interval && isNumber(options.polling_interval) && options.polling_interval >= 30000) {
            this.juicebox.verify(options.polling_interval);
        } else {
            this.juicebox.verify();
        }
    }

    async getHelpText() {
        const url = this.router.url;
        const splitUrl = url.split('/');
        const module = splitUrl[2]
        const result = await this.juicebox.getHelpText(module)
        const language = this.juicebox.getLanguage()
        this.text.set(result && result.success ? result.payload.text[language] : null);
    }

    /** A click on the "?" itself toggles instead */
    protected onHelpOutsideClick(event: MouseEvent, origin: HTMLElement) {
        if (!origin.contains(event.target as Node)) this.helpOpen.set(false);
    }

    async helpTextUpdated() {
        await this.getHelpText();
    }

    ngOnDestroy() {
        this.subscription$.unsubscribe();
    }
}
