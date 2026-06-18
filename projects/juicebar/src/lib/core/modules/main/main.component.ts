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
import {CommonModule} from '@angular/common';
import {NavigationComponent} from './navigation/navigation.component';
import {SidebarComponent} from './sidebar/sidebar.component';
import {SharedModule} from '../../shared/shared.module';
import {GlobalTranslationPipe} from '../../i18n/global.translation';
import {ButtonComponent, IconComponent} from '../../../ui-components';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
  styles:[`.my-custom-class { max-width: 500px; width: 400px; background: #F2F2F2; border: 2px solid #F66802; border-radius: 20px; } .my-custom-class > .arrow { right: 0.5em !important; }`],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GlobalTranslationPipe],
  imports: [
    CommonModule,
    RouterOutlet,
    NavigationComponent,
    SidebarComponent,
    SharedModule,
    ButtonComponent,
    IconComponent,
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

    constructor() {
        this.navigationVisible = toSignal(this.sidebarService.navigationVisible$, { initialValue: true });

        this.juicebox.actionButtons.set([]);
        this.juicebox.searchResults.set([]);

        this.router.events.subscribe(async event => {
            if(event instanceof NavigationEnd) {
                const url = (event as any).urlAfterRedirects ?? event.url;
                const splitUrl = url.split('/');
                const currentModule = splitUrl[2];
                if(currentModule != this.module())
                    await this.getHelpText();
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

        this.subscription$ = this.juicebox.navigationEvent$.subscribe(async event => {
            this.locationTitle.set(await (<any>event).location);
            this.breadcrumps.set(await (<any>event).breadcrumps);
            this.locationSubject.set(await (<any>event).subject);
            this.locationLink.set(await (<any>event).link);
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
            const route = await this.sidebarService.getFirstAccessibleRoute();
            if (route) {
                await this.router.navigateByUrl('/main/' + route);
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

    async helpTextUpdated() {
        await this.getHelpText();
    }

    ngOnDestroy() {
        this.subscription$.unsubscribe();
    }
}
