import {Component, computed, inject, OnDestroy, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute, NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {filter} from 'rxjs';
import {TabComponent, TabsComponent} from '../../../../ui-components';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {ENTITIES_URL, entityName, injectCustomEntityTabs, injectEntitiesOptions} from '../entities-shared';
import {EntitiesService} from '../entities.service';
import {Entity} from '../entities.types';
import {EntitiesTranslationPipe} from '../i18n/entities.translation';

interface EntityTab {
  route: string;
  label: string;
}

/**
 * An opened customer: its name as the page's header and its tabs. Which tabs show depends on the customer's type,
 * the staff member's permissions and roles, and the project's options (the old juicebox went by the project's
 * title): `hiddenTabs` takes out Attributes, Wallets, Push notifications or Payment, `extraTabs` adds Media and API
 * Access. The tabs a project adds for its other modules come last.
 */
@Component({
  selector: 'app-entity-details',
  templateUrl: './entity-details.component.html',
  styleUrl: './entity-details.component.scss',
  imports: [RouterOutlet, TabsComponent, TabComponent],
  providers: [EntitiesTranslationPipe],
})
export class EntityDetailsComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly juicebox = inject(JuiceboxService);
  private readonly entities = inject(EntitiesService);
  private readonly i18n = inject(EntitiesTranslationPipe);
  private readonly options = injectEntitiesOptions();
  private readonly customTabs = injectCustomEntityTabs();
  private readonly canSeeAttributes = !!this.juicebox.hasPermission('entities:role#attributes');
  private readonly canSeeMessages = this.juicebox.hasRole('communication:role');
  private readonly isSuperAdmin = this.juicebox.hasRole('superAdmin:role');

  /** The customer shown; the tabs are created anew for another one */
  protected readonly entityId = signal<string | null>(null);
  private readonly entity = signal<Entity | null>(null);
  protected readonly selectedTabIndex = signal(0);
  private destroyed = false;

  protected readonly tabs = computed<EntityTab[]>(() => {
    const hidden: string[] = this.options.hiddenTabs ?? [];
    const extra: string[] = this.options.extraTabs ?? [];
    const organisation = this.entity()?.type === 'organisation';
    const tabs: EntityTab[] = [
      {route: 'details-entity', label: 'details'},
      {route: 'address-entity', label: 'address'},
    ];
    if (this.canSeeAttributes && !hidden.includes('attributes')) tabs.push({route: 'attributes-entity', label: 'attributes'});
    if (!hidden.includes('wallets')) tabs.push({route: 'wallets-entity', label: 'wallets'});
    if (extra.includes('media')) tabs.push({route: 'media-entity', label: 'media'});
    if (this.canSeeMessages) tabs.push({route: 'history-entity', label: 'history'});
    if (this.canSeeMessages && !hidden.includes('push-notifications')) tabs.push({route: 'push-notifications-entity', label: 'push_notifications'});
    if (organisation && !hidden.includes('payment')) tabs.push({route: 'payment-entity', label: 'payment'});
    if (organisation && this.isSuperAdmin && extra.includes('api-access')) tabs.push({route: 'api-access', label: 'api_access'});
    return [...tabs.map(tab => ({...tab, label: String(this.i18n.transform(tab.label))})), ...this.customTabs];
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const id = params.get('id');
      this.entityId.set(id);
      this.entity.set(null);
      if (id) void this.load(id);
    });
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.syncTab());
    this.syncTab();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.juicebox.setPageHeader(null);
  }

  protected onTabChange(index: number): void {
    const tab = this.tabs()[index];
    if (tab) void this.router.navigate([tab.route], {relativeTo: this.route});
  }

  private async load(id: string): Promise<void> {
    const result = await this.entities.get(id);
    // Another customer was opened meanwhile, or the page was left: the header is no longer this customer's to set
    if (!result?.success || !result.payload || this.entityId() !== id || this.destroyed) return;
    this.entity.set(result.payload);
    this.syncTab();
    const name = entityName(result.payload);
    this.juicebox.setPageHeader({scope: `${ENTITIES_URL}/details/${id}`, title: name});
    this.juicebox.navigationEvent({location: this.i18n.transform('customers'), subject: name, link: ENTITIES_URL});
  }

  /** The tab of the route shown, also when it was opened by its address */
  private syncTab(): void {
    const segment = this.route.snapshot.firstChild?.url[0]?.path;
    const index = this.tabs().findIndex(tab => tab.route === segment);
    if (index !== -1) this.selectedTabIndex.set(index);
  }
}
