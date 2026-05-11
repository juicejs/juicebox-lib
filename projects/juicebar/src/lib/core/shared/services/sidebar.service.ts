import {inject, Injectable, OnDestroy, signal, Signal} from '@angular/core';
// import setup from '../../generator/setup.json';
import {Juice} from './juice.service';
import {Result} from '../types/Result';
import {BehaviorSubject, Subject, Subscription} from 'rxjs';
import {MainTranslationPipe} from '../../modules/main/i18n/main.translation';
import {JuiceboxService} from './Juicebox.service';
import {toObservable} from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root'
})
export class SidebarService implements OnDestroy {

    private juice = inject(Juice);
    private juicebox = inject(JuiceboxService);

    sidebarChange: Subject<any> = new Subject<any>();
    private allRegisteredSidebarItems: SidebarItem[] = [];
    private readonly setupJsonModules: string[] = ['users'];
    private $sub = new Subscription();
    private mainTranslationPipe = new MainTranslationPipe(this.juicebox);

    // Signals for reactive state
    private navigationVisibleSignal = signal<boolean>(true);
    private sidebarCollapsedSignal = signal<boolean>(false);
    private toggleSidebarSubject = new Subject<void>();

    // Expose signals as readonly
    navigationVisible = this.navigationVisibleSignal.asReadonly();
    sidebarCollapsed = this.sidebarCollapsedSignal.asReadonly();

    // Provide observables for backward compatibility
    toggleSidebar$ = this.toggleSidebarSubject.asObservable();
    navigationVisible$ = toObservable(this.navigationVisibleSignal);
    sidebarCollapsed$ = toObservable(this.sidebarCollapsedSignal);

    ngOnDestroy(): void {
        this.$sub.unsubscribe();
    }

    // register sidebar module so it can be visible in the sidebar
    registerSidebarItem(id: string, label: string, role: string, icon: string, router: string) {
        const exists = this.allRegisteredSidebarItems.findIndex(sidebarItem => sidebarItem.id === id);
        if (exists >= 0)
            throw new Error(`Error! Module id: "${id}" from module "${label}" is doubled! Module id must be unique!`)

        this.allRegisteredSidebarItems.push({
            id: id, label: label, role: role, icon: icon, router: router
        });
    }


    // all registered sidebar modules from setup.json
    getAllRegisteredSidebarItems(): SidebarItem[] {
        return this.allRegisteredSidebarItems;
    }


    async getSidebarItemsWithPermissions(user: any, i18n: any){
        const sidebar: { visible: SidebarItem[], hidden: SidebarItem[] } = {visible: [], hidden: []};

        // generate sidebar based on new permission system
        const registeredSidebarItems = this.getAllRegisteredSidebarItems();
        for(let item of registeredSidebarItems){
            const hasRole = user.roles.find(role => role.role == item.role);
            const hasPermission = hasRole && hasRole.permissions['juicebox:visible'] == true;
            if (hasRole && hasPermission){
                if (i18n)
                    item.label = i18n.transform(item.id);
                sidebar.visible.push(item);
            }
        }

        // TODO extend user-service with function o update the users attributes -> sidebar to be saved in attributes.sidebar;
        // check if user has custom sidebar settings
        if (!this.juicebox.getUser().attributes?.settings?.sidebar) {
            if (!this.juicebox.getUser().attributes?.settings) {
                this.juicebox.getUser().attributes.settings = {};
            }
            this.juicebox.getUser().attributes.settings.sidebar = {}
        }

        const t = this.juicebox.getUser().attributes.settings.sidebar[this.juicebox.getUserOrganisationId()];
        sidebar.visible.sort((a, b) => {
            const _a = t ? t[a.role] : a.label;
            const _b = t ? t[b.role] : b.label;
            if (_a > _b) return 1;
            if (_b > _a) return -1;
            return 0;
        })

        return sidebar.visible;
    }

    private visibleSidebarItemsPromise: Promise<SidebarItem[]> | null = null;

    getVisibleSidebarItems(): Promise<SidebarItem[]> {
        if (!this.visibleSidebarItemsPromise) {
            this.visibleSidebarItemsPromise = this.computeVisibleSidebarItems();
        }
        return this.visibleSidebarItemsPromise;
    }

    private async computeVisibleSidebarItems(): Promise<SidebarItem[]> {
        const user = this.juicebox.getUser();
        if (!user) return [];
        const options = await this.juicebox.getOptions();
        if (options.sidebarPermissions) {
            return this.getSidebarItemsWithPermissions(user, this.mainTranslationPipe);
        }
        const res = await this.getSidebarItems(this.juicebox.getUserId(), this.juicebox.getUserOrganisationId());
        return res?.visible ?? [];
    }

    async getFirstAccessibleRoute(): Promise<string | null> {
        const visible = await this.getVisibleSidebarItems();
        return visible.length ? visible[0].router : null;
    }

    // ordered and hidden sidebar modules depending on the role - OLD WAY
    async getSidebarItems(userId: string, organisationId: string): Promise<{ visible: SidebarItem[], hidden: SidebarItem[] }> {
        const sidebar: { visible: SidebarItem[], hidden: SidebarItem[] } = {visible: [], hidden: []};
        const registeredSidebarItems = this.getAllRegisteredSidebarItems();
        const getOrder = await this.getUserSidebar(userId, organisationId, registeredSidebarItems);
        if (!getOrder.success) {
            return null;
        }
        const order = {...getOrder.payload};

        // check if the role exists in the registered sidebar items, translate the sidebar labels
        for (const [key, value] of Object.entries(order)) {
            let find = registeredSidebarItems.find(SidebarItem => SidebarItem.id === key);
            if (find) {
                if (value === false) {
                    find.index = <false>value;
                    find = {...find, label: this.mainTranslationPipe.transform(find.label)};
                    sidebar.hidden.push({...find});
                } else {
                    find.index = <number>value;
                    find = {...find, label: this.mainTranslationPipe.transform(find.label)};
                    sidebar.visible.push({...find});
                }
            }
        }
        // automatically show rearranged sidebar only for logged in user and org
        if (this.juicebox.getUserId() === userId && this.juicebox.getUserOrganisationId() === organisationId) {
            this.sidebarChange.next(sidebar);
        }

        return sidebar;
    }

    getUserSidebar(userId: string, organisationId: string, registeredSidebarItems: SidebarItem[]): Promise<Result<{[key: string]: number | false }>> {
        return this.juice.request(
            'juicebox',
            'getUserSidebar',
            [userId, organisationId, {items: registeredSidebarItems}]
        );
    }

    changeUserSidebarItemIndex(userId: string, organisationId: string, registeredSidebarItems: SidebarItem[], sidebarItemId: string, index: number): Promise<Result> {
        return this.juice.request(
            'juicebox',
            'changeUserSidebarItemIndex',
            [userId, organisationId, {items: registeredSidebarItems}, sidebarItemId, index]
        );
    }

    hideUserSidebarItem(userId: string, organisationId: string, registeredSidebarItems: SidebarItem[], sidebarItemId: string): Promise<Result> {
        return this.juice.request(
            'juicebox',
            'hideUserSidebarItem',
            [userId, organisationId, {items: registeredSidebarItems}, sidebarItemId]
        );
    }

    mergeUserSidebarData(userId: string, registeredSidebarItems: SidebarItem[]): Promise<Result> {
        return this.juice.request(
            'juicebox',
            'mergeUserSidebarData',
            [userId, {items: registeredSidebarItems}]
        );
    }

    toggleSidebar() {
        this.toggleSidebarSubject.next();
    }

    setSidebarCollapsed(isCollapsed: boolean) {
        this.sidebarCollapsedSignal.set(isCollapsed);
    }

    showNavigation(show: boolean) {
        this.navigationVisibleSignal.set(show);
    }

    isNavigationVisible(): boolean {
        return this.navigationVisibleSignal();
    }

    isSidebarCollapsed(): boolean {
        return this.sidebarCollapsedSignal();
    }
}

export type SidebarItem = {
    id: string,
    label: string,
    role: string,
    icon: string,
    router: string,
    index?: number | false
}
