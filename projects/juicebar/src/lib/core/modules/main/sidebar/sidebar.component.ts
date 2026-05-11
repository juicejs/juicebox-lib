import {Component, inject, OnDestroy, OnInit, TemplateRef, ChangeDetectionStrategy, signal} from '@angular/core';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {SidebarItem, SidebarService} from '../../../shared/services/sidebar.service';
import {SocketService} from '../../../shared/services/socket.service';
import {DialogService} from '../../../../ui-components';
import type {CdkDragDrop} from '@angular/cdk/drag-drop';
import {moveItemInArray} from '@angular/cdk/drag-drop';
import {ImageCroppedEvent, ImageCropperComponent} from 'ngx-image-cropper';
import {MainTranslationPipe} from '../i18n/main.translation';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import {filter} from 'rxjs/operators';
import {Subscription} from 'rxjs/internal/Subscription';
import {CommonModule} from '@angular/common';
import {SharedModule} from '../../../shared/shared.module';

@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        RouterLink,
        RouterLinkActive,
        ImageCropperComponent,
        SharedModule,
        MainTranslationPipe
    ]
})
export class SidebarComponent implements OnInit, OnDestroy{

    private subscription: Subscription = new Subscription();

    public temp: Array<{label, role, icon, router, index}>
    public roles: Array<{label, role, icon, router, index}>

    protected readonly user = signal<any>(null);

    protected readonly menu = signal<Array<any>>([]);
    protected readonly userName = signal<string>('');
    protected readonly userID = signal<string>('');

    protected readonly userPicture = signal<string | null>(null);
    protected readonly imageChangedEvent = signal<any>('');
    protected readonly croppedImage = signal<any>('');

    public promiseBtn;
    public i18n: MainTranslationPipe;
    public hasAvatars: boolean = false;

    protected readonly organisationLogo = signal<string>("assets/images/logo_small");
    protected readonly currentUrl = signal<string>('');

    // -- Dragging & Ordering of sidebar
    protected readonly isDragging = signal<boolean>(false);
    subs = new Subscription();

    private sidebarService = inject(SidebarService);
    private socketService = inject(SocketService);
    private router = inject(Router);
    public juicebox = inject(JuiceboxService);
    private dialog = inject(DialogService);

    constructor() {
      this.i18n = new MainTranslationPipe(this.juicebox);

        const juicebox = this.juicebox;
        // TODO check why some users have roles saved as array and some as object
        //  of organisation id with array of roles, now is checking both cases to load modules in sidebar
        this.temp = juicebox.getUser().roles;

        if (this.temp instanceof Array) {
            (<any>this.roles) = this.temp;
        }
        else {
            (<any>this.roles) = Object.values(this.temp)[0];
        }

        const user = juicebox.getUser();
        if (user.attributes && user.attributes.organisationLogo) {
            this.organisationLogo.set(user.attributes.organisationLogo + ".png");
        } else {
            this.organisationLogo.update(logo => logo + ".png");
        }

        this.hasAvatars = this.juicebox.getOptions().avatars;

    }

    onMenuDrop(event: CdkDragDrop<any[]>) {
        if (event.previousIndex !== event.currentIndex) {
            this.menu.update(currentMenu => {
                const updatedMenu = [...currentMenu];
                moveItemInArray(updatedMenu, event.previousIndex, event.currentIndex);
                return updatedMenu;
            });

            // Save the new order to the backend
            const orderMapping = {};
            let i = 0;
            this.menu().forEach(item => { orderMapping[item.role] = i++; });
            this.juicebox.saveSidebarSettings(orderMapping);
        }
        this.isDragging.set(false);
    }

    onMenuDragStarted() {
        this.isDragging.set(true);
    }

    trackByRole(index: number, item: any): any {
        return item.role || index;
    }


    public hasRole(role): boolean {
        for (let rol of this.roles) {
            if (rol.role == role) return true;
        }
        return false
    }

    ngOnInit() {
        this.currentUrl.set(this.router.url);
        this.subscription.add(
            this.router.events.pipe(filter(e => e instanceof NavigationEnd))
                .subscribe((e: NavigationEnd) => this.currentUrl.set(e.urlAfterRedirects))
        );
        this.subscription.add(
            this.sidebarService.toggleSidebar$.subscribe(() => {
                this.collapse();
            })
        );
        this.sidebarService.setSidebarCollapsed(this.juicebox.collapsed);

        this.getUserInfo();
        this.loadSidebarItems();
    }

    private async loadSidebarItems() {
        const visible = await this.sidebarService.getVisibleSidebarItems();
        // stores the visible sidebar items
        this.menu.set(visible);
    }

    ngOnDestroy() {
        this.subs.unsubscribe();
        this.subscription.unsubscribe();
    }

    getUserInfo() {
        const user = this.juicebox.getUser();
        this.user.set(user);
        if (!user) return;

        this.userName.set((user.firstname && user.lastname) ? `${user.firstname} ${user.lastname}` : `${user.email}`);
        this.userID.set(user._id);
        this.userPicture.set(user.attributes && user.attributes.settings && user.attributes.settings.profile_picture ? user.attributes.settings.profile_picture : null);
    }

    fileChangeEvent(event: any): void {
        this.imageChangedEvent.set(event);
    }
    imageCropped(event: ImageCroppedEvent) {
        this.croppedImage.set(event.base64);
    }
    updateProfilePicture(modal) {
        this.promiseBtn = (async () => {
            const result = await this.juicebox.saveUserSettings(this.userID(), {profile_picture: this.croppedImage()})
            if (result.success) {
                this.juicebox.showToast("success", this.i18n.transform('profile_picture_changed'))
                this.userPicture.set(this.croppedImage());
                modal.close();
            } else {
                this.juicebox.showToast("error", this.i18n.transform('profile_picture_change_failed'))
            }
        })();
    }

    public collapse(){
        this.juicebox.collapsed = !this.juicebox.collapsed;
        this.sidebarService.setSidebarCollapsed(this.juicebox.collapsed);
    }

    menuItemClicked(event, router) {
        if (event.type !== 'click') return false;

        let url = "/main/" + router;

        let curl = window.location.pathname;
        let i = curl.indexOf('/main');
        let prefix = curl.substring(0, i);

        if (event.metaKey || event.ctrlKey || event.altKey) {
            const _window = window
            window.open(prefix + url, "_blank");
            return _window.focus();
        }

        this.router.navigateByUrl("/main/" + router);
    }

    isActiveRoute(route) {
        return this.currentUrl().indexOf("main/" + route) != -1;
    }

  // Add this method to your existing sidebar.component.ts

  /**
   * Convert FontAwesome icons to Material Icons
   */
  getMatIcon(fontAwesomeIcon: string): string {
    const iconMap = {
      'fa-home': 'home',
      'fa-dashboard': 'dashboard',
      'fa-users': 'people',
      'fa-user': 'person',
      'fa-settings': 'settings',
      'fa-cog': 'settings',
      'fa-chart-bar': 'bar_chart',
      'fa-analytics': 'analytics',
      'fa-file': 'description',
      'fa-folder': 'folder',
      'fa-envelope': 'email',
      'fa-mail': 'email',
      'fa-phone': 'phone',
      'fa-calendar': 'calendar_today',
      'fa-clock': 'schedule',
      'fa-search': 'search',
      'fa-plus': 'add',
      'fa-edit': 'edit',
      'fa-trash': 'delete',
      'fa-download': 'download',
      'fa-upload': 'upload',
      'fa-star': 'star',
      'fa-heart': 'favorite',
      'fa-bookmark': 'bookmark',
      'fa-tag': 'label',
      'fa-tags': 'labels',
      'fa-shopping-cart': 'shopping_cart',
      'fa-credit-card': 'credit_card',
      'fa-money': 'attach_money',
      'fa-bell': 'notifications',
      'fa-globe': 'public',
      'fa-lock': 'lock',
      'fa-unlock': 'lock_open',
      'fa-key': 'vpn_key',
      'fa-shield': 'security',
      'fa-warning': 'warning',
      'fa-info': 'info',
      'fa-question': 'help',
      'fa-check': 'check',
      'fa-times': 'close',
      'fa-arrow-left': 'arrow_back',
      'fa-arrow-right': 'arrow_forward',
      'fa-arrow-up': 'arrow_upward',
      'fa-arrow-down': 'arrow_downward',
      'fa-chevron-left': 'chevron_left',
      'fa-chevron-right': 'chevron_right',
      'fa-chevron-up': 'expand_less',
      'fa-chevron-down': 'expand_more',
      'fa-menu': 'menu',
      'fa-bars': 'menu',
      'fa-list': 'list',
      'fa-grid': 'grid_view',
      'fa-th': 'apps',
      'fa-database': 'storage',
      'fa-server': 'dns',
      'fa-cloud': 'cloud',
      'fa-wifi': 'wifi',
      'fa-signal': 'signal_cellular_4_bar',
      'fa-battery': 'battery_full',
      'fa-power-off': 'power_settings_new',
      'fa-refresh': 'refresh',
      'fa-sync': 'sync',
      'fa-share': 'share',
      'fa-copy': 'content_copy',
      'fa-paste': 'content_paste',
      'fa-cut': 'content_cut',
      'fa-print': 'print',
      'fa-save': 'save',
      'fa-undo': 'undo',
      'fa-redo': 'redo',
      'fa-play': 'play_arrow',
      'fa-pause': 'pause',
      'fa-stop': 'stop',
      'fa-volume-up': 'volume_up',
      'fa-volume-down': 'volume_down',
      'fa-volume-off': 'volume_off',
      'fa-image': 'image',
      'fa-video': 'videocam',
      'fa-camera': 'camera_alt',
      'fa-microphone': 'mic',
      'fa-headphones': 'headset',
      'fa-gamepad': 'sports_esports',
      'fa-puzzle-piece': 'extension',
      'fa-wrench': 'build',
      'fa-hammer': 'construction',
      'fa-paint-brush': 'brush',
      'fa-palette': 'palette',
      'fa-code': 'code',
      'fa-terminal': 'terminal',
      'fa-bug': 'bug_report',
      'fa-rocket': 'rocket_launch',
      'fa-school': 'school',
      'fa-table': 'file_download'
    };

    // Remove 'fa-' prefix if present and look up the icon
    const cleanIcon = fontAwesomeIcon.replace('fa-', '');
    const materialIcon = iconMap[`fa-${cleanIcon}`] || iconMap[fontAwesomeIcon];

    // If no mapping found, return a default icon or the original
    return materialIcon || 'circle';
  }

}
