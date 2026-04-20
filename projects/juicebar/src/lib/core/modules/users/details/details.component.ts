import {Component, EventEmitter, OnDestroy, OnInit, Output} from '@angular/core';
import {Location} from '@angular/common';
import {ActivatedRoute, Router} from '@angular/router';
import {Subscription} from 'rxjs';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import { ConfigurationService} from '../../../shared/services/configuration.service';
import { MatTabChangeEvent } from '@angular/material/tabs';

@Component({
  selector: 'app-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.css']
})
export class DetailsUsersComponent implements OnInit, OnDestroy {

    //@Input() name:any ;
    @Output()
    backButton: EventEmitter<any> = new EventEmitter<any>();
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

    constructor(public location: Location,
                private route: ActivatedRoute,
                private router: Router,
                public juicebox: JuiceboxService,
                private configurationService: ConfigurationService) {
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

    onTabChange(event: MatTabChangeEvent) {
        const route = this.tabRoutes[event.index];
        if (route) {
            this.router.navigate([route], { relativeTo: this.route });
        }
    }

    ngOnDestroy(): void {
        this.sub.unsubscribe();
    }
}
