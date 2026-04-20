import {Component, Input, OnInit} from '@angular/core';
import {SidebarItem, SidebarService} from '../../../../shared/services/sidebar.service';
import {UsersService} from '../../users.service';
import {UserTranslationPipe} from '../../i18n/user.translation';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {Subscription} from 'rxjs';
import {DragulaService} from 'ng2-dragula';
import {MainTranslationPipe} from '../../../main/i18n/main.translation';
import {ActivatedRoute, Router} from '@angular/router';
import {User} from '../../models/user.model';
import {Result} from '../../../../shared/types/Result';

@Component({
    selector: 'app-sidebar-user',
    templateUrl: './sidebar-user.component.html',
    styleUrls: ['./sidebar-user.component.scss']
})
export class SidebarUserComponent implements OnInit {
    i18n: UserTranslationPipe;
    i18nMain: MainTranslationPipe;
    DRAGULA_SIDEBAR = 'DRAGULA_SIDEBAR';
    public sidebar: SidebarItem[] = [];
    public sidebarHidden: SidebarItem[] = [];
    subs = new Subscription();
    userId: string;
    organisations: any[] = [];
    selectedOrganisation: string;
    disabledDragAndDrop = false;
    // component is reusable, depending of the context where is it used, calls are different
    @Input() context?: 'user-profile' | null;
    @Input() allowHidden?: boolean = true;

    public constructor(private dragulaService:DragulaService,
                       private sidebarService: SidebarService,
                       private userService: UsersService,
                       private juicebox: JuiceboxService,
                       public route: ActivatedRoute,
                       public router: Router) {
      this.i18n = new UserTranslationPipe(this.juicebox);
      this.i18nMain = new MainTranslationPipe(this.juicebox);
    }

    async ngOnInit() {
        if (this.context === 'user-profile') {
            this.userId = this.juicebox.getUserId();
        }
        else {
            this.userId = this.route.snapshot.parent.params['id'];
        }
        await this.getOrganisations();

        this.subs.add(this.dragulaService.dropModel(this.DRAGULA_SIDEBAR)
            .subscribe(async ({ target, source, item, sourceIndex, targetIndex,  sourceModel,
                                  targetModel}) => {
                this.disabledDragAndDrop = true;
                const registeredSidebarModules = this.sidebarService.getAllRegisteredSidebarItems();
                if (target.id === 'sidebarHidden') {
                    const result = await this.sidebarService.hideUserSidebarItem(this.userId, this.selectedOrganisation, registeredSidebarModules, item.id);
                    if (!result.success) {
                        this.juicebox.showToast("error", "Error", this.i18n.transform(result.error));
                        return;
                    }
                }
                else {
                    const result = await this.sidebarService.changeUserSidebarItemIndex(this.userId, this.selectedOrganisation, registeredSidebarModules, item.id, targetIndex);
                    if (!result.success) {
                        this.juicebox.showToast("error", "Error", this.i18n.transform(result.error));
                        return;
                    }
                }
                await this.getSidebarItems();
                this.disabledDragAndDrop = false;
            })
        );
        const getUser = await this.userService.getUser(this.userId);
        this.juicebox.navigationEvent({
            location: this.context === 'user-profile' ? this.i18nMain.transform('user_profile') : this.i18n.transform('users'),
            subject: getUser.payload.email + ' - ' + this.i18n.transform('sidebar'),
            link: this.context === 'user-profile' ? null : '/main/users'
        });
        this.getSidebarItems();
    }

    ngOnDestroy() {
        this.subs.unsubscribe();
    }

    async getSidebarItems() {
        const sidebarItem =  await this.sidebarService.getSidebarItems(this.userId, this.selectedOrganisation);
        if (sidebarItem === null) {
            return;
        }
        this.sidebar = JSON.parse(JSON.stringify(sidebarItem.visible));
        this.sidebarHidden = JSON.parse(JSON.stringify(sidebarItem.hidden));
    }

    // only organisations in which users has roles
    async getOrganisations(): Promise<any> {
        let getUser: Result<User>;
        if (this.context === 'user-profile') {
            getUser = await this.juicebox.getJuiceboxUser();
        }
        else {
            getUser = await this.userService.getUser(this.userId);
        }
       const userRoles = Object.keys(getUser.payload.roles);

        const result = await this.juicebox.getOrganisations(this.userId);
        if (!result.payload || !result.payload.length) return false;
        this.organisations = [...result.payload.filter(org => userRoles.includes(org._id))];
        if (!this.selectedOrganisation) {
            const find = this.organisations.find(organisation => organisation._id === this.juicebox.getUserOrganisationId())
            if (find) {
                this.selectedOrganisation = find._id;
                return;
            }
            this.selectedOrganisation = this.organisations[0]._id;
        }
    }

    organisationChanged() {
        this.getSidebarItems()
    }

}
