import {Component, EventEmitter, OnDestroy, OnInit, Output} from '@angular/core';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {Router} from '@angular/router';
import {Location} from '@angular/common';
import {MatDialog} from '@angular/material/dialog';
import {HelpComponent} from './help/help.component';
import {MainTranslationPipe} from '../i18n/main.translation';
import {Subscription} from 'rxjs';
import {ClientRoutesService} from '../../../shared/services/client-routes.service';

export interface Language {
  name: string,
  code: string
}

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})

export class NavigationComponent implements OnInit, OnDestroy {

  public locationTitle: any;
  public subject: string;
  public link: string;
  public selectedLanguage: any;
  public code: any;
  public languages: Array<Language>;
  public user: any;
  public i18n: any;
  public fileInfo: { name: string, extension: string, type: string, path: string };
  public userName;
  public userEmail;

  public organisationLogo: string = "assets/juicebar/images/logo_small";

  public breadcrumps: Array<any> = null;

  private subscription$: Subscription = new Subscription();

  public userOrganisations: Array<any> = [];
  public selectedUserOrganisation: string;
  public selectedUserOrganisationName: string;

  public organisationName;

  public projectTitle: string;

  @Output() helpTextUpdatedEventEmitter: EventEmitter<any> = new EventEmitter<any>()

  constructor(public juicebox: JuiceboxService,
              public router: Router,
              private clientRoutes: ClientRoutesService,
              public juiceboxService: JuiceboxService,
              public location: Location,
              public dialog: MatDialog) {

    this.projectTitle = this.juicebox.getProjectTitle();
    this.organisationLogo += ".png";
  }

  async ngOnInit() {
    this.subscription$ = this.juicebox.navigationEvent$.subscribe(event => {
      this.locationTitle = (<any>event).location;
      this.breadcrumps = (<any>event).breadcrumps;
    });

    this.i18n = new MainTranslationPipe(this.juicebox);
    this.user = this.juicebox.getUser();
    this.userName = (this.user.firstname && this.user.lastname) ?
      `${this.user.firstname} ${this.user.lastname}` : `${this.user.email}`;
    this.userEmail = this.user.email;
    this.languages = this.getLanguages();
    this.selectedLanguage = this.getPreselectedLanguage();
    await this.getFileInfo();

    this.juicebox.getAvailableOrganisations(0, 200, {hideOrganisationsNotInRoles: true}).then(res => {
      if (!res.success) return;

      this.userOrganisations = res.payload.items;

      this.userOrganisations.sort((a, b) => {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
      });
    })

    this.canSwitchOrganisations = (this.userOrganisations.length > 1);

    this.juicebox.getLoggedInOrganisation().then(res => {
      this.organisationName = res.name
      this.selectedUserOrganisation = res._id;
    });
  }

  public canSwitchOrganisations: boolean = false;

  onOrganisationSwitch(organisationId: string) {
    this.juicebox.switchActiveOrganisation(organisationId).then(async res => {
      console.log(res)
      // @ts-ignore
      if (!res) {
        this.juicebox.getLoggedInOrganisation().then(res => {
          this.organisationName = res.name
          this.selectedUserOrganisation = res._id;
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription$.unsubscribe();
  }

  private getLanguages(): Array<Language> {
    const options = this.juicebox.getOptions();
    if (options.languages && options.languages.length)
      return [...options.languages];
    return [];
  }

  public goto(location) {
    console.log("niw");
  }

  private getPreselectedLanguage(): Language {
    let userLanguageCode = this.juicebox.getUserLanguage();
    if (!userLanguageCode) {
      userLanguageCode = this.i18n.defaultLanguage;
    }

    const supportedLanguage = this.languages.find(lang => lang.code === userLanguageCode)
    if (supportedLanguage) {
      this.juicebox.setLanguage(supportedLanguage.code);
      return supportedLanguage;
    } else {
      const fallBackLanguage = this.languages[0];
      this.juicebox.setLanguage(fallBackLanguage.code);
      return fallBackLanguage;
    }
  }

  private async getFileInfo() {
    const result = await this.juicebox.getHelpFileInfo(this.router.url.split("/")[2], this.juicebox.getLanguage());
    this.fileInfo = result && result.success ? result.payload : null;
  }

  async changeLanguage(language: Language) {
    if (language === this.selectedLanguage) return;

    this.selectedLanguage = language;
    this.juicebox.setLanguage(this.selectedLanguage.code);
    await this.juicebox.saveUserSettings(this.user._id, {language: this.selectedLanguage.code});
    location.reload();
  }

  getHelp() {
    this.dialog.open(HelpComponent, {
      disableClose: false,
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop'
    });
  }

  public searching: boolean = false;

  doSearch($event) {
    if ($event.target.value == "") {
      this.juicebox.searchActive = false;
      this.searching = false;
      return;
    }

    this.juicebox.searchActive = true;
    this.searching = true;
    this.juicebox.doSearch($event.target.value).then(result => {
      this.searching = false;
    });
  }

  logout() {
    this.juiceboxService.logout();
  }

  async back() {
    await this.router.navigate([this.link]);
  }

  async goHome() {
    await this.router.navigate(['']);
  }

  async goToUserProfile() {
    await this.router.navigate(['/main/user-profile']);
  }

  getComponentWidth() {
    if (!this.juicebox.nextUi) {
      return {
        'width': '100%',
      };
    } else {
      if (this.juicebox.collapsed) {
        return {
          'width': 'calc(100% - 70px)',
        };
      } else {
        return {
          // 'width': 'calc(100% - 220px)',
          'width': 'calc(100%)',
        };
      }
    }
  }
}


