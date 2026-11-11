import {Component, computed, inject, OnDestroy, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute, NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {filter} from 'rxjs';
import {CATEGORIES_CUSTOMIZATION} from '../../../../config/base-app.config';
import {CustomTab, getCustomTabs} from '../../../../config/route-customization';
import {TabComponent, TabsComponent} from '../../../../ui-components';
import {AutoLanguagePipe} from '../../../shared/pipes/auto-language.pipe';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {injectCategoriesOptions} from '../categories-shared';
import {CategoriesService} from '../categories.service';
import {CategoriesTranslationPipe} from '../i18n/categories.translation';

/**
 * A category's tabs: details, media and, for a subcategory without children (where articles go), its included
 * articles. Tabs a project adds with `componentOverrides` (e.g. Carl Stahl's SEO) come after them.
 */
@Component({
  selector: 'app-category-details',
  templateUrl: './category-details.component.html',
  styleUrl: './category-details.component.scss',
  imports: [RouterOutlet, TabsComponent, TabComponent],
  providers: [CategoriesTranslationPipe],
})
export class CategoryDetailsComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly juicebox = inject(JuiceboxService);
  private readonly categories = inject(CategoriesService);
  private readonly i18n = inject(CategoriesTranslationPipe);
  private readonly autoLanguage = new AutoLanguagePipe(this.juicebox);
  private readonly options = injectCategoriesOptions();
  private readonly customTabs = this.translatedCustomTabs();

  /** The category shown; the tabs are created anew for another one */
  protected readonly categoryId = signal<string | null>(null);
  private readonly showIncludedArticles = signal(false);
  protected readonly selectedTabIndex = signal(0);

  private readonly builtInTabs: Record<string, CustomTab> = {
    details: {route: 'details-category', label: this.i18n.transform('details')},
    media: {route: 'media-category', label: this.i18n.transform('media')},
    articles: {route: 'included-articles-category', label: this.i18n.transform('included_articles')},
  };

  protected readonly tabs = computed<CustomTab[]>(() => {
    const tabs = [this.builtInTabs['details'], this.builtInTabs['media']];
    if (this.showIncludedArticles()) tabs.push(this.builtInTabs['articles']);
    const builtIn = new Set(tabs.map(tab => tab.route));
    return [...tabs, ...this.customTabs.filter(tab => !builtIn.has(tab.route))];
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const id = params.get('id');
      this.categoryId.set(id);
      this.showIncludedArticles.set(false);
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
    const [result, isVariant] = await Promise.all([
      this.categories.getCategory(id),
      this.categories.isArticleVariant(id, this.options.showInactive ? {showInactive: true} : {}),
    ]);
    if (this.categoryId() !== id || !result?.success || !result.payload) return;
    const category = result.payload;
    // As in the old tabs: a first-level category has no articles
    this.showIncludedArticles.set(isVariant && !!category.parent_id);
    this.syncTab();
    const name = this.autoLanguage.transform(category.name);
    this.juicebox.setPageHeader({
      scope: `/main/categories/details/${id}`,
      title: name,
    });
    this.juicebox.navigationEvent({location: this.i18n.transform('categories'), subject: name, link: '/main/categories'});
  }

  /** The tab of the route shown, also when it was opened by its address */
  private syncTab(): void {
    const segment = this.route.snapshot.firstChild?.url[0]?.path;
    const index = this.tabs().findIndex(tab => tab.route === segment);
    if (index !== -1) this.selectedTabIndex.set(index);
  }

  private translatedCustomTabs(): CustomTab[] {
    const overrides = inject(CATEGORIES_CUSTOMIZATION, {optional: true})?.componentOverrides;
    return getCustomTabs(overrides, ['details/:id'], this.juicebox).map(tab => {
      const label = this.i18n.transform(tab.label);
      return {...tab, label: typeof label === 'string' && !label.startsWith('@') ? label : tab.label};
    });
  }
}
