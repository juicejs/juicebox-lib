import {Component, computed, inject, OnDestroy, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute, NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {filter} from 'rxjs';
import {TabComponent, TabsComponent} from '../../../../ui-components';
import {AutoLanguagePipe} from '../../../shared/pipes/auto-language.pipe';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {LocationsTranslationPipe} from '../i18n/locations.translation';
import {injectLocationsOptions} from '../locations-shared';
import {LocationsService} from '../locations.service';
import {StoredLocation} from '../locations.types';

interface LocationTab {
  route: string;
  label: string;
}

/**
 * A location's tabs: details, attributes, media, documents and, for a venue, its seating layout. A project can hide
 * the attributes and documents tabs (provideLocations({options: {hiddenTabs}})).
 */
@Component({
  selector: 'app-location-details',
  templateUrl: './location-details.component.html',
  styleUrl: './location-details.component.scss',
  imports: [RouterOutlet, TabsComponent, TabComponent],
  providers: [LocationsTranslationPipe],
})
export class LocationDetailsComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly juicebox = inject(JuiceboxService);
  private readonly locations = inject(LocationsService);
  private readonly i18n = inject(LocationsTranslationPipe);
  private readonly autoLanguage = new AutoLanguagePipe(this.juicebox);
  private readonly hiddenTabs = injectLocationsOptions().hiddenTabs ?? [];

  /** The location shown; the tabs are created anew for another one */
  protected readonly locationId = signal<string | null>(null);
  private readonly location = signal<StoredLocation | null>(null);
  protected readonly selectedTabIndex = signal(0);

  protected readonly tabs = computed<LocationTab[]>(() => {
    const tabs: LocationTab[] = [{route: 'details-location', label: 'details'}];
    if (!this.hiddenTabs.includes('attributes')) tabs.push({route: 'attributes-location', label: 'attributes'});
    tabs.push({route: 'location-media', label: 'media'});
    if (!this.hiddenTabs.includes('documents')) tabs.push({route: 'location-documents', label: 'documents'});
    if (this.location()?.type === 'venue') tabs.push({route: 'seating-layout-location', label: 'seating_layout'});
    return tabs.map(tab => ({...tab, label: this.i18n.transform(tab.label)}));
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const id = params.get('id');
      this.locationId.set(id);
      if (id) void this.load(id);
    });
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.syncTab());
    this.syncTab();
  }

  ngOnDestroy(): void {
    this.juicebox.setPageHeader(null);
  }

  protected onTabChange(index: number): void {
    const tab = this.tabs()[index];
    if (tab) void this.router.navigate([tab.route], {relativeTo: this.route});
  }

  private async load(id: string): Promise<void> {
    const result = await this.locations.get(id);
    if (!result?.success || !result.payload || this.locationId() !== id) return;
    const location = result.payload;
    this.location.set(location);
    this.syncTab();
    const name = this.autoLanguage.transform(location.name ?? '');
    this.juicebox.setPageHeader({
      scope: `/main/location/details/${id}`,
      eyebrow: this.i18n.transform('location'),
      title: name,
    });
    this.juicebox.navigationEvent({location: this.i18n.transform('location'), subject: name, link: '/main/location'});
  }

  /** The tab of the route shown, also when it was opened by its address */
  private syncTab(): void {
    const segment = this.route.snapshot.firstChild?.url[0]?.path;
    const index = this.tabs().findIndex(tab => tab.route === segment);
    if (index !== -1) this.selectedTabIndex.set(index);
  }
}
