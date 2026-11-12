import { Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, NavigationStart, Route, Router, RouterEvent, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { JuiceboxService} from '../../shared/services/Juicebox.service';
import { SocketService} from '../../shared/services/socket.service';
import { isNumber} from '../../shared/util';
import {OnInit, Component, ViewEncapsulation, signal, Signal, ChangeDetectionStrategy, inject, Injector, Type} from '@angular/core';
import {NgComponentOutlet} from '@angular/common';
import {firstValueFrom, isObservable, Subscription} from 'rxjs';
import {SidebarService} from '../../shared/services/sidebar.service';
import {toSignal} from '@angular/core/rxjs-interop';
import {NavigationComponent} from './navigation/navigation.component';
import {SidebarComponent} from './sidebar/sidebar.component';
import {SHARED_IMPORTS} from '../../shared/shared-imports';
import {ButtonComponent, IconComponent} from '../../../ui-components';
import {ConnectedPosition, OverlayModule} from '@angular/cdk/overlay';
import {MainTranslationPipe} from './i18n/main.translation';
import {LISTING_PANE, ListingPane} from '../../shared/components/listing-pane/listing-pane';

/** The listing shown next to an open record */
interface ListingPaneView {
  route: Route;
  component: Type<unknown>;
  injector: Injector;
}

/** Remembers in the browser whether the user hid the list next to an open record */
const LISTING_PANE_HIDDEN_KEY = 'juicebar.listingPaneHidden';


@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    NavigationComponent,
    SidebarComponent,
    SHARED_IMPORTS,
    ButtonComponent,
    IconComponent,
    OverlayModule,
    NgComponentOutlet
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
    private injector = inject(Injector);
    public juicebox = inject(JuiceboxService);
    public socketService = inject(SocketService);
    public sidebarService = inject(SidebarService);

    /** The split view: the module's listing, compact, while one of its records is open */
    protected readonly listingPane = signal<ListingPaneView | null>(null);
    private readonly openRecordId = signal<string | null>(null);
    private readonly pane: ListingPane = { activeId: this.openRecordId.asReadonly() };
    private listingPaneRequest = 0;
    /** The record alone, without the list: the user's choice, kept for the next records and visits */
    protected readonly listingPaneHidden = signal(readListingPaneHidden());
    private readonly mainPipe = new MainTranslationPipe(this.juicebox);
    protected readonly hideListLabel = this.mainPipe.transform('hide_list');
    protected readonly showListLabel = this.mainPipe.transform('show_list');

    /** The module's help text, opened from the "?" next to the page's actions (ngbPopover in the old app) */
    protected readonly helpOpen = signal(false);
    protected readonly helpLabel = this.mainPipe.transform('help');
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
                const moduleChanged = currentModule != this.module();
                // The page's own parts first; the module's help text comes from the backend and may take a while
                this.module.set(currentModule);
                this.resolvePageHeader(url);
                void this.resolveListingPane();
                if (moduleChanged) {
                    this.helpOpen.set(false);
                    await this.getHelpText();
                }
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

    /**
     * Only a record has a header (its name, set by its page with a scope); it stays while its tabs change. Other pages
     * have none: the breadcrumb already says where you are.
     */
    private resolvePageHeader(url: string) {
        const current = this.juicebox.pageHeader();
        if (current?.scope && url.startsWith(current.scope)) return;
        this.juicebox.setPageHeader(null);
    }


    /**
     * A record route (`data.splitView`) with a listing route next to it (`data.listingPane`) gets that listing as a
     * compact list beside it. The list stays while another record of the same module is opened.
     */
    private async resolveListingPane() {
        let record: ActivatedRouteSnapshot | null = null;
        for (let route: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root; route; route = route.firstChild) {
            if (route.routeConfig?.data?.['splitView']) record = route;
        }
        const listing = record?.parent?.routeConfig?.children
            ?.find(child => child.path === '' && child.data?.['listingPane']);
        this.openRecordId.set(record?.params['id'] ?? null);

        const request = ++this.listingPaneRequest;
        if (!listing) {
            this.listingPane.set(null);
            return;
        }
        if (this.listingPane()?.route === listing) return;

        const loading = listing.loadComponent?.();
        const loaded = isObservable(loading) ? await firstValueFrom(loading) : await loading;
        const component = listing.component ?? (typeof loaded === 'function' ? loaded : loaded?.default);
        if (request !== this.listingPaneRequest || !component) return;
        this.listingPane.set({
            route: listing,
            component,
            injector: Injector.create({ providers: [{ provide: LISTING_PANE, useValue: this.pane }], parent: this.injector }),
        });
    }

    protected toggleListingPane() {
        const hidden = !this.listingPaneHidden();
        this.listingPaneHidden.set(hidden);
        try {
            localStorage.setItem(LISTING_PANE_HIDDEN_KEY, String(hidden));
        } catch {
            // Storage blocked: the choice lasts until the page is reloaded
        }
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

function readListingPaneHidden(): boolean {
    try {
        return localStorage.getItem(LISTING_PANE_HIDDEN_KEY) === 'true';
    } catch {
        return false;
    }
}
