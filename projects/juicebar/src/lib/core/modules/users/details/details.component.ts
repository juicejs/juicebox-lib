import {Component, computed, inject, OnDestroy, OnInit, output, signal, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule, Location} from '@angular/common';
import {ActivatedRoute, NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {Subscription} from 'rxjs';
import {filter} from 'rxjs/operators';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import { ConfigurationService} from '../../../shared/services/configuration.service';
import { TabsComponent, TabComponent } from '../../../../ui-components';
import {SharedModule} from '../../../shared/shared.module';
import {UserTranslationPipe} from '../i18n/user.translation';

interface TabDef {
    label: string;
    route: string;
}

@Component({
  selector: 'app-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterOutlet,
    TabsComponent,
    TabComponent,
    SharedModule,
    UserTranslationPipe
  ]
})
export class DetailsUsersComponent implements OnInit, OnDestroy {

    backButton = output<any>();
    public data: Array<any> = [];
    public email: Array<any> = [];
    private sub: Subscription;
    private id: any;
    public name: any;
    projectTitle: string;
    protected readonly channels = signal<Array<string>>([]);
    protected readonly selectedTabIndex = signal<number>(0);
    public actionButtons: any;

    public location = inject(Location);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    public juicebox = inject(JuiceboxService);
    private configurationService = inject(ConfigurationService);

    protected readonly visibleTabs = computed<TabDef[]>(() => {
        const tabs: TabDef[] = [{ label: 'details', route: 'details-user' }];

        if (
            this.projectTitle !== 'Equipments' &&
            this.projectTitle !== 'CSJuicEcommerce' &&
            this.projectTitle !== 'CSWP' &&
            this.projectTitle !== 'Carl Stahl Configurator'
        ) {
            tabs.push({ label: 'organisations', route: 'organisations-user' });
        }
        if (this.juicebox.hasPermission('users:role#roles')) {
            tabs.push({ label: 'roles', route: 'roles-user' });
        }
        if (this.juicebox.hasPermission('groups:role#read')) {
            tabs.push({ label: 'groups', route: 'groups-user' });
        }
        if (!this.deprecated()) {
            tabs.push({ label: 'sidebar', route: 'sidebar-user' });
        }
        if (this.juicebox.hasPermission('customers:role#read')) {
            tabs.push({ label: 'customers', route: 'customers-user' });
        }
        if (this.juicebox.hasPermission('customers:role#allowed-types')) {
            tabs.push({ label: 'allowed_types', route: 'allowed-types-user' });
        }
        if (this.juicebox.hasPermission('clients:role#super-admin') && this.juicebox.hasPermission('pdf:role')) {
            tabs.push({ label: 'clients', route: 'clients-user' });
        }
        if (this.channels()?.length > 1 && this.juicebox.hasPermission('users:role#roles')) {
            tabs.push({ label: 'channels', route: 'channels-user' });
        }

        return tabs;
    });

    constructor() {
        this.projectTitle = this.juicebox.getProjectTitle();
    }

    async ngOnInit() {
        this.sub = this.route.paramMap.subscribe(async paramMap => {
            this.id = (paramMap as any).params.id;
        });
        this.channels.set((await this.configurationService.getBySchema(
            "carlstahl:channel"
        )).payload);

        this.syncSelectedTabFromUrl();
        this.sub.add(
            this.router.events
                .pipe(filter(e => e instanceof NavigationEnd))
                .subscribe(() => this.syncSelectedTabFromUrl())
        );
    }

    private syncSelectedTabFromUrl() {
        const child = this.route.snapshot.firstChild;
        const segment = child?.url[0]?.path;
        if (!segment) return;
        const idx = this.visibleTabs().findIndex(t => t.route === segment);
        if (idx !== -1 && idx !== this.selectedTabIndex()) {
            this.selectedTabIndex.set(idx);
        }
    }

    deprecated(){
        return this.juicebox.getOptions().sidebarPermissions;
    }

    public setActionButtons(buttons: Array<{ title: string, icon: string, type: string, callback: any }>){
        this.actionButtons = buttons;
    }

    onTabChange(index: number) {
        const tab = this.visibleTabs()[index];
        if (tab) {
            this.router.navigate([tab.route], { relativeTo: this.route });
        }
    }

    ngOnDestroy(): void {
        this.sub.unsubscribe();
    }
}
