import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { User } from '../../models/user.model';
import { UserTranslationPipe } from '../../i18n/user.translation';
import { UsersService } from '../../users.service';
import { JuiceboxService} from '../../../../shared/services/Juicebox.service';
// import {TraineesService} from "../../../trainees/trainees.service";
// import {Trainee} from "../../../../models/trainee.model";

@Component({
    selector: 'app-main-user-wizard',
    templateUrl: './main-wizard.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainWizardComponent implements OnInit {

    public userForm: FormGroup;
    public user: User;

    // public trainees: Trainee[] = [];
    filteredTrainees: any[] = [];
    emailAutocompleteOptions: Array<{value: any, label: string}> = [];
    configuration: any;
    projectTitle: string;

    public promiseBtn: any;
    public i18n: UserTranslationPipe;

    multipleTabs: boolean = false;
    tabPaths: Array<string> = [];

    languages: any[] = [];
    salutations: any[];

    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private userService = inject(UsersService);
    public juicebox = inject(JuiceboxService);
    private userPipe = inject(UserTranslationPipe);

    constructor() {
      this.i18n = new UserTranslationPipe(this.juicebox);
    }

    async ngOnInit() {
        // this.checkForMultipleTabs();
        this.juicebox.navigationEvent({
            location: this.i18n.transform('user'),
            subject: this.i18n.transform('create_user'),
            link: '/main/users'
        });

        this.languages = this.juicebox.getOptions()?.languages.map(l => {
            return {
                code: l.code,
                name: this.userPipe.transform(l.name)
            };
        });

        this.salutations = this.juicebox.getSalutations();

        this.userForm = new FormGroup({
            entity_id: new FormControl(null),
            salutation: new FormControl(this.salutations ? this.salutations[0].key : null),
            firstname: new FormControl('', Validators.required),
            email: new FormControl(null, [Validators.required, Validators.email]),
            lastname: new FormControl('', Validators.required),
            nickname: new FormControl(''),
            language: new FormControl(this.languages ? this.languages[0].code : '')
        });

        this.projectTitle = this.juicebox.getProjectTitle();
        if (this.projectTitle === 'QualityCircle' || this.projectTitle === 'FireCircle') {
            await this.typed();
            // this.filteredTrainees = this.trainees;
        }
    }

    private checkForMultipleTabs() {
        const currentRoutes = this.router.config;
        const router = this.findRouter(currentRoutes[1], 'users,user-wizard');

        this.multipleTabs = router.children.length > 2;
        this.tabPaths = router.children.map(r => r.path);
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

    publish(): any {
        this.userForm.markAllAsTouched();
        if (this.userForm.invalid)
           {
            return new Promise(resolve => setTimeout(resolve, 200));
        }

        this.promiseBtn = (async () => {
            const result = await this.userService.createUser({ ...this.userForm.value, redirect_url: window.location.protocol + '//' + window.location.host });
            if (result.success) {
                this.userForm.markAsPristine();
                this.juicebox.showToast('success', this.i18n.transform('user_profile_created'));
                await this.router.navigate(['/main/users/details/' + result.payload._id + '/details-user']);
            } else {
                this.juicebox.showToast('error', this.i18n.transform(result.error));
            }
        })();
    }

    async next() {
        const currentPath = this.router.url.split('user-wizard/')[1];
        const currentPathIndex = this.tabPaths.findIndex(path => path === currentPath);
        if (currentPathIndex < 0) {
            return;
        }

        await this.router.navigate(['../', this.tabPaths[currentPathIndex + 1]], { relativeTo: this.route, state: this.userForm.value });
    }

    onSelectChange(selected: any) {
        if (!selected) {
            this.userForm.patchValue({
                entity_id: null,
                email: null
            });
            return;
        }

        this.userForm.patchValue({
            entity_id: selected._id,
            firstname: selected.firstname,
            lastname: selected.lastname,
            email: selected.email
        });

    }

    addCustomEmail(term: string) {
        return {
            email: term
        };
    }

    getDisplayValue(item: any): string {
        return item.email + ' ' + item.firstname + ' ' + item.lastname;
    }

    displayEmailFn(email: string): string {
        return email || '';
    }

    async typed() {
        const organisationId = this.juicebox.getUserOrganisationId();
        // const result = await this.traineesService.fetchAllTraineesWithoutUserProfile(organisationId);
        //
        // if (!result.success) return;
        //
        // this.trainees = result.payload;
        // this.filteredTrainees = [...this.trainees];
        //
        // //remove trainees with email null
        // this.trainees = this.trainees.filter(item => item.email !== null);
    }

    customSearchEmail(term: string, item: any) {
        if (!term) return true;

        term = term.toLowerCase().trim();

        if (!item?.email) return false;

        const email = item.email.toLowerCase();
        return email.includes(term);
    }

    onSearch(data: any) {
        // this.filteredTrainees = [...this.trainees];

        const searchTerm = (typeof data === 'string' ? data : data?.term)?.trim() || '';
        //
        // if (!searchTerm) {
        //     this.filteredTrainees = [...this.trainees];
        // } else {
        //     this.filteredTrainees = this.trainees.filter(item =>
        //         this.customSearchEmail(searchTerm, item)
        //     );
        // }
    }

}
