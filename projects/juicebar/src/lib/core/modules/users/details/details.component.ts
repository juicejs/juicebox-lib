import {Component, EventEmitter, inject, OnDestroy, OnInit, output, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule, Location} from '@angular/common';
import {ActivatedRoute, Router, RouterOutlet} from '@angular/router';
import {Subscription} from 'rxjs';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import { ConfigurationService} from '../../../shared/services/configuration.service';
import { TabsComponent, TabComponent } from '../../../../ui-components';
import {SharedModule} from '../../../shared/shared.module';
import {UserTranslationPipe} from '../i18n/user.translation';

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

    //@Input() name:any ;
    backButton = output<any>();
    public data: Array<any> = [];
    public email: Array<any> = [];
    private sub: Subscription;
    private id: any;
    public name: any;
    projectTitle: string;
    public channels: Array<string> = [];
    selectedTabIndex: number = 0;
    public actionButtons: any;

    private tabRoutes: string[] = [
        'details-user',
        'organisations-user', 
        'roles-user',
        'groups-user',
        'sidebar-user',
        'customers-user',
        'allowed-types-user',
        'clients-user',
        'channels-user'
    ];

    public location = inject(Location);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    public juicebox = inject(JuiceboxService);
    private configurationService = inject(ConfigurationService);

    constructor() {
        this.projectTitle = this.juicebox.getProjectTitle();
    }

    async ngOnInit() {
        this.sub = this.route.paramMap.subscribe(async paramMap => {
            this.id = (paramMap as any).params.id;
        });
        this.channels = (await this.configurationService.getBySchema(
            "carlstahl:channel"
        )).payload;
    }

    deprecated(){
        return this.juicebox.getOptions().sidebarPermissions;
    }

    public setActionButtons(buttons: Array<{ title: string, icon: string, type: string, callback: any }>){
        this.actionButtons = buttons;
    }

    onTabChange(index: number) {
        const route = this.tabRoutes[index];
        if (route) {
            this.router.navigate([route], { relativeTo: this.route });
        }
    }

    ngOnDestroy(): void {
        this.sub.unsubscribe();
    }
}
