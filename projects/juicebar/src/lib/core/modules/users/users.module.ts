import {CUSTOM_ELEMENTS_SCHEMA, NgModule, Type} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { UsersService } from './users.service';
import { UsersComponent } from './users.component';
import { DetailsUsersComponent } from './details/details.component';
import { UserListingComponent } from './listing/user-listing.component';
import { DetailsUserComponent } from './details/details-user/details-user.component';
import { DocumentsUserComponent } from './details/documents-user/documents-user.component';
import { WalletsUserComponent } from './details/wallets-user/wallets-user.component';
import { UserWizardComponent } from './user-wizard/user-wizard.component';
import { AddWalletUserComponent } from './details/wallets-user/add-wallet-user/add-wallet-user-component';
import { RolesUserComponent } from './details/roles-user/roles-user.component';
import { UserTranslationPipe } from './i18n/user.translation';
import { SharedModule } from '../../shared/shared.module';
import { GroupsUserComponent } from './details/groups-user/groups-user.component';
import { GroupsModalComponent } from './listing/groups-modal/groups-modal.component';
import { GroupsNameEditorComponent } from './listing/groups-modal/groups-name-editor.component/groups-name-editor.component';
import { JuiceboxService} from '../../shared/services/Juicebox.service';
import { CreateVendorComponent} from './listing/create-vendor/create-vendor.component';
import { IJuiceboxExtensions} from '../../shared/models/searchprovider.interface';
import { SidebarUserComponent } from './details/sidebar-user/sidebar-user.component';
import { DragulaModule } from 'ng2-dragula';
import { MainWizardComponent } from './user-wizard/main-wizard/main-wizard.component';
import { OrganisationsUserComponent } from './details/organisations-user/organisations-user.component';
import { LoginAsAnotherUserComponent } from './listing/login-as-another-user/login-as-another-user.component';
import { ChannelsUserComponent } from './details/channels-user/channels-user.component';
import { ModuleCustomizationService } from '../../shared/services/module-customization.service';
// import {UsersExtensionsModule} from "./users.extensions.module";


@NgModule({
    declarations: [
        // Moved to imports - standalone is default in Angular v20+
    ],
  imports: [
    RouterModule,
    HttpClientModule,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    SharedModule,
    DragulaModule,
    // Standalone components (default in Angular v20+)
    UsersComponent,
    UserListingComponent,
    DetailsUsersComponent,
    DetailsUserComponent,
    DocumentsUserComponent,
    WalletsUserComponent,
    UserWizardComponent,
    AddWalletUserComponent,
    RolesUserComponent,
    ChannelsUserComponent,
    UserTranslationPipe,
    GroupsUserComponent,
    GroupsModalComponent,
    GroupsNameEditorComponent,
    CreateVendorComponent,
    MainWizardComponent,
    OrganisationsUserComponent,
    SidebarUserComponent,
    LoginAsAnotherUserComponent
    // UsersExtensionsModule
  ],
    exports: [RouterModule, SidebarUserComponent],
    providers: [UserTranslationPipe],
    bootstrap: [],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class UsersModule implements IJuiceboxExtensions {

    constructor(
        private juicebox: JuiceboxService,
        private userService: UsersService,
        private router: Router,
    ) {


        juicebox.registerSearchProvider(this, 'Users', 'fa-users', "users#role");
    }

    async search(token: string): Promise<Array<{ title: string; details: string; link: string }>> {
        const results = await this.userService.search([{
            property: 'firstname',
            fullText: true,
            language: false,
            term: token
        }, {
            property: 'lastname',
            fullText: true,
            language: false,
            term: token
        }, {
            property: 'email',
            fullText: true,
            language: false,
            term: token
        }], 0, 10);


        return results.payload.items.map(user => {
            return {
                title: user.firstname + ' ' + user.lastname,
                details: user.email + ' - ',
                link: 'main/users/details/' + user._id + '/details-user'
            };
        });
    }

    /**
     * Dynamically add tab to any path in users module
     * @param routerLink
     * @param component
     * @param path
     */
    registerDynamicTab(routerLink: string, component: any, path: string) {
        const currentRoutes = this.router.config;
        const router = this.findRouter(currentRoutes[1], path);

        router.children.push({
            path: routerLink,
            component: component
        });
        this.router.resetConfig(currentRoutes);
    }

    // overwrites users module route with provided component, e.g. if you want to overwrite user details page
    // with your own component do: overwriteRoute(['details/:id', 'details-user'], CustomUserDetailsComponent)
    overwriteRoute(routePath: string[], component: Type<any>) {
        const usersRouteConfig = this.router.config.find(item => item.path === 'main').children.find(route => route.path === 'users');

        let temp = usersRouteConfig;

        const routeNodeToUpdate = routePath.reduce<any>((res, pathPart) => {
            const routeNode = res.children.find(node => node.path === pathPart);

            if (!routeNode) {
                throw new Error('could_not_find_route_with_provided_path');
            }

            res = routeNode;

            return res;
        }, usersRouteConfig);

        routeNodeToUpdate.component = component;

        this.router.resetConfig(this.router.config);
    }

    private findRouter(route: any, path: string) {
        const _path = path.split(',');
        if (_path.length > 1) {
            const router = this.findRouter(route, _path.shift());
            return this.findRouter(router, _path.join(','));
        } else {
            return route.children.find(route => {
                return route.path == path;
            });
        }
    }

}
