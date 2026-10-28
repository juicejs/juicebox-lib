import {Component, input, OnInit, ChangeDetectionStrategy, inject, signal} from '@angular/core';
import {SidebarItem, SidebarService} from '../../../../shared/services/sidebar.service';
import {UsersService} from '../../users.service';
import {UserTranslationPipe} from '../../i18n/user.translation';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup, moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';
import {MainTranslationPipe} from '../../../main/i18n/main.translation';
import {ActivatedRoute, Router} from '@angular/router';
import {User} from '../../models/user.model';
import {Result} from '../../../../shared/types/Result';
import {SharedModule} from '../../../../shared/shared.module';
import {ProgressSpinnerComponent} from '../../../../../ui-components';

@Component({
    selector: 'app-sidebar-user',
    templateUrl: './sidebar-user.component.html',
    styleUrls: ['./sidebar-user.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [SharedModule, CdkDropListGroup, CdkDropList, CdkDrag, ProgressSpinnerComponent]
})
export class SidebarUserComponent implements OnInit {
    private sidebarService = inject(SidebarService);
    private usersService = inject(UsersService);
    private juicebox = inject(JuiceboxService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);

    i18n: UserTranslationPipe;
    i18nMain: MainTranslationPipe;

    protected readonly sidebar = signal<SidebarItem[]>([]);
    protected readonly sidebarHidden = signal<SidebarItem[]>([]);
    protected readonly organisations = signal<any[]>([]);
    protected readonly selectedOrganisation = signal<string>('');
    protected readonly disabledDragAndDrop = signal(false);

    // component is reusable, depending of the context where is it used, calls are different
    context = input<'user-profile' | null>();
    allowHidden = input<boolean>(true);

    private userId: string;

    constructor() {
      this.i18n = new UserTranslationPipe(this.juicebox);
      this.i18nMain = new MainTranslationPipe(this.juicebox);
    }

    async ngOnInit() {
        const isUserProfile = this.context() === 'user-profile';

        if (isUserProfile) {
            this.userId = this.juicebox.getUserId();
        } else {
            this.userId = this.route.snapshot.parent.params['id'];
        }

        await this.getOrganisations();

        if (isUserProfile) {
            const getUser = await this.usersService.getUser(this.userId);
            this.juicebox.navigationEvent({
                location: this.i18nMain.transform('user_profile'),
                subject: getUser.payload.email + ' - ' + this.i18n.transform('sidebar'),
                link: null
            });
        }

        this.getSidebarItems();
    }

    /** Saves a move right away: into "hidden" hides the item, anywhere else sets its position. */
    async onDrop(event: CdkDragDrop<SidebarItem[]>) {
        const sameList = event.previousContainer === event.container;
        if (sameList && event.previousIndex === event.currentIndex) return;

        const lists: Record<string, SidebarItem[]> = {
            sidebar: [...this.sidebar()],
            sidebarHidden: [...this.sidebarHidden()]
        };
        if (sameList) {
            moveItemInArray(lists[event.container.id], event.previousIndex, event.currentIndex);
        } else {
            transferArrayItem(lists[event.previousContainer.id], lists[event.container.id], event.previousIndex, event.currentIndex);
        }
        this.sidebar.set(lists['sidebar']);
        this.sidebarHidden.set(lists['sidebarHidden']);

        const item: SidebarItem = event.item.data;
        const registeredSidebarModules = this.sidebarService.getAllRegisteredSidebarItems();
        this.disabledDragAndDrop.set(true);
        try {
            const result = event.container.id === 'sidebarHidden'
                ? await this.sidebarService.hideUserSidebarItem(this.userId, this.selectedOrganisation(), registeredSidebarModules, item.id)
                : await this.sidebarService.changeUserSidebarItemIndex(this.userId, this.selectedOrganisation(), registeredSidebarModules, item.id, event.currentIndex);
            if (!result.success) {
                this.juicebox.showToast("error", "Error", this.i18n.transform(result.error));
            }
            // Reload either way: shows the saved order, or undoes the move after an error
            await this.getSidebarItems();
        } finally {
            this.disabledDragAndDrop.set(false);
        }
    }

    async getSidebarItems() {
        const sidebarItem = await this.sidebarService.getSidebarItems(this.userId, this.selectedOrganisation());
        if (sidebarItem === null) {
            return;
        }
        this.sidebar.set(JSON.parse(JSON.stringify(sidebarItem.visible)));
        this.sidebarHidden.set(JSON.parse(JSON.stringify(sidebarItem.hidden)));
    }

    // only organisations in which users has roles
    async getOrganisations(): Promise<any> {
        let getUser: Result<User>;
        if (this.context() === 'user-profile') {
            getUser = await this.juicebox.getJuiceboxUser();
        }
        else {
            getUser = await this.usersService.getUser(this.userId);
        }
        const userRoles = Object.keys(getUser.payload.roles);

        const result = await this.juicebox.getOrganisations(this.userId);
        if (!result.payload || !result.payload.length) return false;

        const filtered = result.payload.filter((org: any) => userRoles.includes(org._id));
        this.organisations.set(filtered);

        if (!this.selectedOrganisation()) {
            const find = filtered.find((org: any) => org._id === this.juicebox.getUserOrganisationId());
            this.selectedOrganisation.set(find ? find._id : filtered[0]._id);
        }
    }

    organisationChanged() {
        this.getSidebarItems();
    }

}
