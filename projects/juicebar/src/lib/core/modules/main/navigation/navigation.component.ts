import {Component, inject, OnInit, output, ChangeDetectionStrategy, signal, computed, viewChild, ElementRef} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {NavigationEnd, Router} from '@angular/router';
import {filter} from 'rxjs/operators';
import {DialogService} from '../../../../ui-components/dialog/dialog.service';
import {HelpComponent} from './help/help.component';
import {MainTranslationPipe} from '../i18n/main.translation';
import {SidebarService} from '../../../shared/services/sidebar.service';
import {CdkMenuModule} from '@angular/cdk/menu';
import {SHARED_IMPORTS} from '../../../shared/shared-imports';
import {ThemeService, Theme} from '../../../shared/services/theme.service';
import {BrandService} from '../../../shared/services/brand.service';
import {ViewportService} from '../../../../ui-components/viewport/viewport.service';

export interface Language {
  name: string;
  code: string;
}

interface UserShape {
  _id: string;
  email: string;
  firstname?: string;
  lastname?: string;
  attributes?: { settings?: { theme?: string; language?: string } };
}

interface FileInfo {
  name: string;
  extension: string;
  type: string;
  path: string;
}

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CdkMenuModule,
    SHARED_IMPORTS,
    MainTranslationPipe
]
})
export class NavigationComponent implements OnInit {

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private searchReturnUrl: string | null = null;

  public languages = signal<Array<Language>>([]);
  public fileInfo = signal<FileInfo | null>(null);

  public userOrganisations = signal<Array<any>>([]);
  public selectedUserOrganisation: string;
  public organisationName = signal<string>('');
  public orgSearch = signal<string>('');
  public filteredOrganisations = computed(() => {
    const q = this.orgSearch().trim().toLowerCase();
    const all = this.userOrganisations();
    return q ? all.filter(o => o.name?.toLowerCase().includes(q)) : all;
  });

  private user: UserShape | null = null;
  private i18n!: MainTranslationPipe;
  private selectedLanguage = signal<Language | null>(null);

  helpTextUpdatedEventEmitter = output<any>();

  public juicebox = inject(JuiceboxService);
  public router = inject(Router);
  public dialog = inject(DialogService);
  private themeService = inject(ThemeService);
  protected sidebarService = inject(SidebarService);
  public theme = this.themeService.theme;
  private readonly brand = inject(BrandService);
  /** The signed-in user, for the avatar and its menu */
  private readonly signedIn = this.juicebox.getUser() as UserShape | null;
  protected readonly userName = [this.signedIn?.firstname, this.signedIn?.lastname].filter(Boolean).join(' ')
    || this.signedIn?.email || '';
  /** Under the name in the menu, when the name isn't the address itself */
  protected readonly userEmail = this.signedIn?.email && this.signedIn.email !== this.userName ? this.signedIn.email : '';
  /** The project's logo, or the user's organisation logo */
  protected readonly logo = signal(this.brand.sidebarLogo());
  /** May edit the help document; fixed while the page lives, as switching the organisation reloads it */
  private readonly canEditHelp = !!this.juicebox.hasPermission('juicebox:role#edit-help-document');
  /** There is a help document for this module, or the user may add one */
  protected readonly helpAvailable = computed(() => !!this.fileInfo() || this.canEditHelp);
  /** On a phone the search is an icon until it is opened, and help, language and theme are in the user's menu */
  protected readonly phone = inject(ViewportService).phone;
  protected readonly searchOpen = signal(false);

  constructor() {
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe(e => {
      const url = e.urlAfterRedirects ?? e.url;
      if (!url.startsWith('/main/search')) {
        const input = this.searchInput()?.nativeElement;
        if (input?.value) input.value = '';
        if (input !== document.activeElement) this.searchOpen.set(false);
      }
    });
  }

  async ngOnInit() {
    this.i18n = new MainTranslationPipe(this.juicebox);
    this.user = this.juicebox.getUser() as UserShape;

    const storedTheme: Theme = this.user?.attributes?.settings?.theme === 'light' ? 'light' : 'dark';
    this.themeService.init(storedTheme);

    this.languages.set(this.getLanguages());
    this.selectedLanguage.set(this.getPreselectedLanguage());

    await this.loadFileInfo();

    this.juicebox.getAvailableOrganisations(0, 200, {hideOrganisationsNotInRoles: true}).then(res => {
      if (!res.success) return;
      const items = [...res.payload.items].sort((a, b) => {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
      });
      this.userOrganisations.set(items);
    });

    this.juicebox.getLoggedInOrganisation().then(res => {
      this.organisationName.set(res.name);
      this.selectedUserOrganisation = res._id;
    });
  }

  onOrgSearch($event: Event) {
    this.orgSearch.set(($event.target as HTMLInputElement).value);
  }

  onOrganisationSwitch(organisationId: string) {
    this.juicebox.switchActiveOrganisation(organisationId).then(async res => {
      // @ts-ignore — service typed as Promise<void> but returns truthy on failure
      if (!res) {
        this.juicebox.getLoggedInOrganisation().then(r => {
          this.organisationName.set(r.name);
          this.selectedUserOrganisation = r._id;
        });
      }
    });
  }

  private getLanguages(): Array<Language> {
    const options = this.juicebox.getOptions();
    if (options.languages && options.languages.length) {
      return [...options.languages];
    }
    return [];
  }

  private getPreselectedLanguage(): Language {
    const current = this.juicebox.getLanguage();
    return this.languages().find(lang => lang.code === current) ?? this.languages()[0];
  }

  private async loadFileInfo() {
    const result = await this.juicebox.getHelpFileInfo(this.router.url.split('/')[2], this.juicebox.getLanguage());
    this.fileInfo.set(result && result.success ? result.payload : null);
  }

  async changeLanguage(language: Language) {
    if (language === this.selectedLanguage()) return;

    this.selectedLanguage.set(language);
    this.juicebox.setLanguage(language.code);
    if (this.user) {
      await this.juicebox.saveUserSettings(this.user._id, {language: language.code});
    }
    location.reload();
  }

  getHelp() {
    this.dialog.open(HelpComponent, {
      disableClose: false,
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop'
    });
  }

  doSearch($event: Event) {
    this.search(($event.target as HTMLInputElement).value.trim());
  }

  /** The search field takes the focus wherever its pill is clicked; on a phone that opens it */
  protected focusSearch() {
    this.searchInput()?.nativeElement.focus();
  }

  /** Left empty (spaces search for nothing either), the search folds back to its icon on a phone */
  protected onSearchBlur() {
    const input = this.searchInput()?.nativeElement;
    if (input && !input.value.trim()) {
      input.value = '';
      this.searchOpen.set(false);
    }
  }

  /** Phone: the search's close button empties the field, which leaves the results as emptying it by hand does */
  protected closeSearch($event: Event) {
    $event.stopPropagation();
    const input = this.searchInput()?.nativeElement;
    if (input) {
      input.value = '';
      input.blur();
    }
    this.searchOpen.set(false);
    this.search('');
  }

  private search(value: string) {
    const onSearch = this.router.url.startsWith('/main/search');

    if (value === '') {
      if (onSearch) {
        this.router.navigateByUrl(this.searchReturnUrl ?? '/main');
        this.searchReturnUrl = null;
      }
      return;
    }

    if (onSearch) {
      // Replace so each keystroke doesn't pile up history entries.
      this.router.navigate(['/main/search'], { queryParams: { q: value }, replaceUrl: true });
    } else {
      // Remember the page we came from so clearing the search returns to it.
      this.searchReturnUrl = this.router.url;
      this.router.navigate(['/main/search'], { queryParams: { q: value } });
    }
  }

  /** An organisation logo that does not load gives way to the project's */
  protected onLogoError() {
    if (this.logo() !== this.brand.logo) this.logo.set(this.brand.logo);
  }

  /** The logo opens the main page: the first module of the user's sidebar, where /main itself leads */
  protected async goHome() {
    const route = await this.sidebarService.getFirstAccessibleRoute();
    if (route) await this.router.navigateByUrl('/main/' + route);
  }

  protected goToProfile() {
    void this.router.navigate(['main/user-profile/details']);
  }

  protected logout() {
    this.juicebox.logout();
  }

  toggleTheme() {
    this.themeService.toggle();
  }

}
