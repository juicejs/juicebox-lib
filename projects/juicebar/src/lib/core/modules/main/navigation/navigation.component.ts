import {Component, inject, OnInit, output, input, ChangeDetectionStrategy, signal, computed, viewChild, ElementRef} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {NavigationEnd, Router} from '@angular/router';
import {filter} from 'rxjs/operators';
import {CommonModule} from '@angular/common';
import {DialogService} from '../../../../ui-components/dialog/dialog.service';
import {HelpComponent} from './help/help.component';
import {MainTranslationPipe} from '../i18n/main.translation';
import {CdkMenuModule} from '@angular/cdk/menu';
import {SharedModule} from '../../../shared/shared.module';
import {ThemeService, Theme} from '../../../shared/services/theme.service';

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
    CommonModule,
    CdkMenuModule,
    SharedModule,
    MainTranslationPipe
  ]
})
export class NavigationComponent implements OnInit {

  readonly locationTitle = input<string>(null);
  readonly locationSubject = input<string>(null);
  readonly locationLink = input<any>(null);

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
  public theme = this.themeService.theme;

  constructor() {
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe(e => {
      const url = e.urlAfterRedirects ?? e.url;
      if (!url.startsWith('/main/search')) {
        const input = this.searchInput()?.nativeElement;
        if (input?.value) input.value = '';
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
    const value = ($event.target as HTMLInputElement).value.trim();
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

  toggleTheme() {
    this.themeService.toggle();
  }

  async goTo(url: string) {
    if (url) await this.router.navigateByUrl(url);
  }

}
