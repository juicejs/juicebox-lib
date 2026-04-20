import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, NavigationStart, Router, RouterEvent } from '@angular/router';
import { filter } from 'rxjs/operators';
import { JuiceboxService} from '../../shared/services/Juicebox.service';
import { SocketService} from '../../shared/services/socket.service';
import { isNumber} from '../../shared/util';
import {OnInit, Component, ViewEncapsulation, ChangeDetectorRef, AfterViewInit} from '@angular/core';
import {Subscription} from 'rxjs';
import {HelpComponent} from './navigation/help/help.component';
import {MatDialog} from '@angular/material/dialog';
import {SidebarService} from '../../shared/services/sidebar.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
  styles:[`.my-custom-class { max-width: 500px; width: 400px; background: #F2F2F2; border: 2px solid #F66802; border-radius: 20px; } .my-custom-class > .arrow { right: 0.5em !important; }`],
  encapsulation: ViewEncapsulation.None
})
export class MainComponent implements OnInit, AfterViewInit {

    public locationLink: any;
    public locationTitle: any;
    public locationSubject: any;
    public breadcrumps: Array<any> = null;
    public text: string;
    public module: string;
    navigationVisible = true;

    private subscription$: Subscription = new Subscription();
    constructor(private titleService: Title,
                private router: Router,
                public juicebox: JuiceboxService,
                public socketService: SocketService,
                private dialog: MatDialog,
                public route: ActivatedRoute,
                public sidebarService: SidebarService,
                private cdr: ChangeDetectorRef) {

        // Initialize empty arrays to prevent "changed after checked" errors
        this.juicebox.actionButtons = [];
        this.juicebox.searchResults = [];

        this.router.events.subscribe(async event => {
            if(event instanceof NavigationEnd) {
                const url = event.url;
                const splitUrl = url.split('/');
                const module = splitUrl[2];
                if(module != this.module)
                    await this.getHelpText();
                this.module = module;
            }
        })

        this.setTitle()
        this.setLanguage();
        this.verifyConnection();
        socketService.connect();

        // @ts-ignore
        router.events.pipe(filter((e: Event): e is RouterEvent => e instanceof NavigationStart)
        ).subscribe((e) => {
            // Clear buttons without triggering template updates during initialization
            this.juicebox.actionButtons = [];
        });

        this.subscription$ = this.juicebox.navigationEvent$.subscribe(async event => {
            this.locationTitle = await (<any>event).location;
            this.breadcrumps = await (<any>event).breadcrumps;
            this.locationSubject = await (<any>event).subject;
            this.locationLink = await (<any>event).link;
        });

        // show 2fa warning after succesfull login
        if (localStorage.getItem("2fawarning")){
            this.juicebox.showToast("warning", "2FA", localStorage.getItem("2fawarning"),{
                disableTimeOut: true
            } );
            localStorage.removeItem("2fawarning");
        }
    }

    ngOnInit() {
        this.subscription$.add(
            this.sidebarService.navigationVisible$.subscribe(show => {
                this.navigationVisible = show;
                // Ensure change detection runs after updating visibility
                this.cdr.detectChanges();
            })
        );
    }

    ngAfterViewInit() {
        // Run a change detection cycle after view init to ensure everything is in sync
        setTimeout(() => {
            this.cdr.detectChanges();
        }, 0);
    }

    private setTitle() {
        const options = this.juicebox.getOptions();
        if (options && options.title) {
            this.titleService.setTitle(options.title);
        }
    }

    private setLanguage(): void {
        const options = this.juicebox.getOptions()
        const languages = this.juicebox.getAllSystemLanguages();
        const userLanguageCode = this.juicebox.getUserLanguage();
        const browserLanguage = navigator.language.split('-')[0];
        const supportedBrowserLanguage = languages.find(l => l.includes(browserLanguage));

        if (userLanguageCode) {
            this.juicebox.setLanguage(userLanguageCode);
            return;
        }

        if (options && options.default_language) {
            this.juicebox.setLanguage(options.default_language);
            return;
        }

        if (supportedBrowserLanguage) {
            this.juicebox.setLanguage(supportedBrowserLanguage);
            return;
        }
    }

    public async goTo(url){
        await this.router.navigateByUrl(url);
    }

    public async openResult(result){
        this.juicebox.searchActive = false;
        await this.router.navigateByUrl(result.link);
    }

    public openHelpModal() {
        const dialogRef = this.dialog.open(HelpComponent, {
            width: '800px',
            maxWidth: '90vw',
            data: { text: this.text }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.helpTextUpdated();
            }
        });
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
        this.text = result && result.success ? result.payload.text[language] : null;
    }

    async helpTextUpdated() {
        await this.getHelpText();
    }

    getContentContainerStyle() {
        return {
            'margin-top': this.navigationVisible ? '3.5rem' : '0'
        };
    }

    ngOnDestroy() {
        this.subscription$.unsubscribe();
    }

    // Helper method to map button types to Material colors
    getButtonColor(buttonType: string): string {
        switch (buttonType) {
            case 'btn-primary':
                return 'primary';
            case 'btn-secondary':
                return 'accent';
            case 'btn-success':
                return 'primary';
            case 'btn-danger':
                return 'warn';
            case 'btn-warning':
                return 'accent';
            case 'btn-info':
                return 'primary';
            default:
                return 'primary';
        }
    }

    // Helper method to map FontAwesome icons to Material icons
    getButtonIcon(faIcon: string): string {
        const iconMap: { [key: string]: string } = {
            'fa-plus-circle': 'add_circle',
            'fa-plus': 'add',
            'fa-edit': 'edit',
            'fa-trash': 'delete',
            'fa-download': 'download',
            'fa-upload': 'upload',
            'fa-save': 'save',
            'fa-search': 'search',
            'fa-filter': 'filter_list',
            'fa-user': 'person',
            'fa-users': 'group',
            'fa-cog': 'settings',
            'fa-home': 'home',
            'fa-arrow-left': 'arrow_back',
            'fa-arrow-right': 'arrow_forward',
            'fa-check': 'check',
            'fa-times': 'close',
            'fa-info': 'info',
            'fa-warning': 'warning',
            'fa-refresh': 'refresh',
            'fa-copy': 'content_copy',
            'fa-print': 'print',
            'fa-file': 'description',
            'fa-folder': 'folder',
            'fa-calendar': 'event',
            'fa-clock': 'schedule',
            'fa-mail': 'mail',
            'fa-phone': 'phone',
            'fa-star': 'star'
        };

        // Remove fa- prefix if present and lookup
        const cleanIcon = faIcon.startsWith('fa-') ? faIcon : `fa-${faIcon}`;
        return iconMap[cleanIcon] || 'add'; // default to 'add' icon
    }
}

