import {Component, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute, NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {filter} from 'rxjs/operators';
import {TabComponent, TabsComponent} from '../../../ui-components';
import {JuiceboxService} from '../../shared/services/Juicebox.service';
import {CommunicationsTranslationPipe} from './i18n/communications.translation';

interface CommunicationsTab {
  route: string;
  label: string;
  permission: string;
}

/** The module's tabs, in the old order; each shows only with the permission of its name (COMMROLE) */
const TABS: Array<Omit<CommunicationsTab, 'label'> & {labelKey: string}> = [
  {route: 'send', labelKey: 'send-tool', permission: 'communication:role#send'},
  {route: 'contents', labelKey: 'contents', permission: 'communication:role#contents'},
  {route: 'automation', labelKey: 'automation', permission: 'communication:role#automation'},
  {route: 'history', labelKey: 'history', permission: 'communication:role#history'},
];

/** The communications page (CommunicationsPage): its tabs over the open tab */
@Component({
  selector: 'app-communications',
  templateUrl: './communications.component.html',
  styleUrl: './communications.component.scss',
  imports: [RouterOutlet, TabsComponent, TabComponent],
  providers: [CommunicationsTranslationPipe],
})
export class CommunicationsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly juicebox = inject(JuiceboxService);
  private readonly i18n = inject(CommunicationsTranslationPipe);

  protected readonly tabs: CommunicationsTab[] = TABS
    .filter(tab => this.juicebox.hasPermission(tab.permission))
    .map(tab => ({route: tab.route, permission: tab.permission, label: this.i18n.transform(tab.labelKey)}));
  private readonly openRoute = signal<string | null>(null);
  /** The open screen is a listing (its route's `listing`): its table follows the tabs' line */
  protected readonly listingOpen = signal(false);
  /** No record header above the tabs: they stand right under the breadcrumb bar's line and keep a distance from it */
  protected readonly underBar = computed(() => !this.juicebox.pageHeader());
  protected readonly selectedTabIndex = computed(() => Math.max(0, this.tabs.findIndex(tab => tab.route === this.openRoute())));

  constructor() {
    this.syncTab();
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.syncTab());
  }

  protected onTabChange(index: number): void {
    const tab = this.tabs[index];
    if (tab) void this.router.navigate([tab.route], {relativeTo: this.route});
  }

  private syncTab(): void {
    const tab = this.route.snapshot.firstChild;
    this.openRoute.set(tab?.routeConfig?.path ?? null);
    let screen = tab;
    while (screen?.firstChild) screen = screen.firstChild;
    this.listingOpen.set(!!screen?.data['listing']);
  }
}
