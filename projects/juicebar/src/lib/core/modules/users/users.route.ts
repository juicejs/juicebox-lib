import { UsersComponent } from './users.component';
import { UserListingComponent } from './listing/user-listing.component';
import { UserWizardComponent } from './user-wizard/user-wizard.component';
import { DetailsUsersComponent } from './details/details.component';
import { DetailsUserComponent } from './details/details-user/details-user.component';
import { DocumentsUserComponent } from './details/documents-user/documents-user.component';
import { WalletsUserComponent } from './details/wallets-user/wallets-user.component';
import { RolesUserComponent } from './details/roles-user/roles-user.component';
import { Routes } from '@angular/router';
import { GroupsUserComponent } from './details/groups-user/groups-user.component';
// import { UnsavedChangesGuard } from '../../guards/unsaved-changes.guard';
import { SidebarUserComponent } from './details/sidebar-user/sidebar-user.component';
import { MainWizardComponent } from './user-wizard/main-wizard/main-wizard.component';
import { OrganisationsUserComponent } from './details/organisations-user/organisations-user.component';
import { ChannelsUserComponent } from './details/channels-user/channels-user.component';

export const UsersRoute: Routes = [{
    path: 'users',
    component: UsersComponent,
    children: [
        {
            path: '',
            component: UserListingComponent
        },
        {
            path: 'user-wizard',
            component: UserWizardComponent,
            children: [
                {
                    path: '',
                    redirectTo: 'main',
                    pathMatch: 'full'
                },
                {
                    path: 'main',
                    component: MainWizardComponent
                }
            ]
        },
        {
            path: 'details/:id',
            component: DetailsUsersComponent,
            children: [
                {
                    path: '',
                    redirectTo: 'details-user',
                    pathMatch: 'full'
                },
                {
                    path: 'details-user',
                    component: DetailsUserComponent,
                    // canDeactivate: [UnsavedChangesGuard]
                },
                {
                    path: 'documents-user',
                    component: DocumentsUserComponent
                },
                {
                    path: 'wallets-user',
                    component: WalletsUserComponent
                },
                {
                    path: 'roles-user',
                    component: RolesUserComponent
                },
                {
                    path: 'channels-user',
                    component: ChannelsUserComponent
                },
                {
                    path: 'groups-user',
                    component: GroupsUserComponent
                },
                {
                    path: 'sidebar-user',
                    component: SidebarUserComponent
                },
                {
                    path: 'organisations-user',
                    component: OrganisationsUserComponent
                }]
        }]
}];
