import { Component, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute } from "@angular/router";
import { ConfigurationService} from '../../../../shared/services/configuration.service';
import { JuiceboxService} from '../../../../shared/services/Juicebox.service';
import { UsersService } from "../../users.service";
import { UserTranslationPipe } from "../../i18n/user.translation";
import DefaultChannelAccess from "./channel-access-default";
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../../../shared/shared.module';

@Component({
    selector: "app-channels-user",
    templateUrl: "./channels-user.component.html",
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        FormsModule,
        SharedModule,
        UserTranslationPipe
    ]
})
export class ChannelsUserComponent implements OnInit {

    public userId: string;
    public user: any;
    public channels = [];
    public rows = [];
    public allPermissions: { key: string; }[];
    public displayedColumns: string[] = ['name', 'permissions'];

    i18n: UserTranslationPipe;

    constructor(
        private configurationService: ConfigurationService,
        public route: ActivatedRoute,
        protected juicebox: JuiceboxService,
        private userService: UsersService
    ) {
      this.i18n = new UserTranslationPipe(this.juicebox)
    }

    async ngOnInit() {
        this.userId = this.route.snapshot.parent?.params["id"];
        await this.getUserData();
        await this.getChannelData();
    }

    async getUserData() {
        const result = await this.userService.getUser(this.userId);
        if (!result.success) {
            this.juicebox.showToast("error", "Error fetching User");
        }

        this.user = result.payload;
    }

    async getChannelData() {
        let channelResult = await this.configurationService.getBySchema(
            "carlstahl:channel"
        );
        this.allPermissions = Object.keys(DefaultChannelAccess[0].permissions).map(
            (key) => {
                return {
                    key: key,
                };
            }
        );
        let userChannelAccess = this.user.attributes?.channelAccess ?? [];

        this.channels = channelResult.payload.map((channel) => {
            let rowPermissions = {
                ...DefaultChannelAccess.find(item => item.key === channel.options.key)?.permissions,
                ...userChannelAccess.find(item => item.key === channel.options.key)?.permissions
            }

            return {
                key: channel.options.key,
                permissions: rowPermissions,
            };
        });
        this.rows = this.channels;
    }

    async togglePermission(row) {
        let permissionsToAdd;
        Object.keys(row.permissions).forEach(item => row.permissions[item] === true ? permissionsToAdd = { ...permissionsToAdd, [item]: row.permissions[item]} : null)
        const data = {
            channel: row.key,
            permissions: permissionsToAdd
        }

        const result = await this.userService.updateChannelAccessPermissions(
            this.user._id,
            data
        );

        if (!result || !result.success) {
            this.juicebox.showToast(
                "error",
                "Error",
                this.i18n.transform("permission_update_failed")
            );
            return;
        }

        this.juicebox.showToast("success", "Success", "", { timeout: 500 });
    }
}
