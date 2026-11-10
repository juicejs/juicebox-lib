import {Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {
  CellDefDirective,
  ColumnConfig,
  DataTableComponent,
  HeaderDefDirective,
  IconComponent,
  PageEvent,
  SortState,
  TooltipDirective,
} from '../../../../../ui-components';
import {ISearchTerm} from '../../../../shared/interfaces/ISearchTerm';
import {AutoLanguagePipe} from '../../../../shared/pipes/auto-language.pipe';
import {ConfigurationService} from '../../../../shared/services/configuration.service';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {hasArticlesModule} from '../../categories-shared';
import {CategoriesService} from '../../categories.service';
import {CategoryArticle} from '../../categories.types';
import {CategoriesTranslationPipe} from '../../i18n/categories.translation';

interface ArticleRow {
  _id: string;
  name: string;
  sapId: string;
  active: boolean;
  public: boolean;
  type: string;
  /** The article is private for a reason (e.g. a missing translation) */
  privacyWarning: boolean;
}

/** Typed filters wait for typing to pause */
const FILTER_DELAY_MS = 300;
/** The old tab's order until a column is sorted */
const DEFAULT_SORT: SortState = {prop: 'created', dir: 'desc'};

/**
 * The articles in the category, as the old tab listed them from `juicecommerce:articles`: filtered by name (and by
 * SAP-ID where articles have one), sorted on the server. An article links to its page when the project has an
 * articles module.
 */
@Component({
  selector: 'app-included-articles',
  templateUrl: './included-articles.component.html',
  styleUrl: './included-articles.component.scss',
  imports: [RouterLink, DataTableComponent, CellDefDirective, HeaderDefDirective, IconComponent, TooltipDirective, CategoriesTranslationPipe],
  providers: [CategoriesTranslationPipe],
})
export class IncludedArticlesComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly categories = inject(CategoriesService);
  private readonly configuration = inject(ConfigurationService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly i18n = inject(CategoriesTranslationPipe);
  private readonly autoLanguage = new AutoLanguagePipe(this.juicebox);
  private readonly language = this.juicebox.getLanguage();
  private readonly categoryId = this.route.parent?.snapshot.paramMap.get('id') ?? null;
  protected readonly linked = hasArticlesModule(this.router);

  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly pageSizeOptions = [10, 20, 30, 50];
  protected readonly sort = signal<SortState>({prop: '', dir: ''});
  protected readonly count = signal(0);
  private readonly articles = signal<CategoryArticle[]>([]);
  private readonly showPublicStatus = signal(false);
  private typed: ISearchTerm[] = [];
  private filterTimer?: ReturnType<typeof setTimeout>;
  private request = 0;

  protected readonly rows = computed<ArticleRow[]>(() => {
    const showPublicStatus = this.showPublicStatus();
    return this.articles().map(article => ({
      _id: article._id,
      name: this.autoLanguage.transform(article.name, this.language),
      sapId: article.attributes?.sapId ?? '',
      active: !!article.active,
      public: article.public !== false,
      type: article.type ?? 'product',
      privacyWarning: showPublicStatus && !!article.attributes?.privacyReason?.length && article.public === false,
    }));
  });

  private readonly column: Record<string, ColumnConfig> = {
    name: {key: 'name', label: this.i18n.transform('name'), sortable: true},
    sapId: {key: 'attributes.sapId', label: 'SAP-ID', sortable: true},
    active: {key: 'active', label: this.i18n.transform('status'), sortable: true, width: '110px'},
    public: {key: 'public', label: this.i18n.transform('public'), sortable: true, width: '110px'},
    type: {key: 'type', label: this.i18n.transform('type'), sortable: true, width: '160px'},
  };

  /** The SAP-ID column shows when the articles have one, as in the old tab; the public one with showPublicStatus */
  protected readonly columns = computed<ColumnConfig[]>(() => [
    this.column['name'],
    ...(this.rows()[0]?.sapId ? [this.column['sapId']] : []),
    this.column['active'],
    ...(this.showPublicStatus() ? [this.column['public']] : []),
    this.column['type'],
  ]);

  async ngOnInit(): Promise<void> {
    const config = await this.configuration.getByKey('juicecommerce:articles');
    this.showPublicStatus.set(!!config?.payload?.options?.showPublicStatus);
    await this.fetch();
  }

  ngOnDestroy(): void {
    clearTimeout(this.filterTimer);
  }

  protected onFilter(property: string, term: string): void {
    // The name is searched in the language of the articles shown, as the old tab did
    const firstName = this.articles()[0]?.name;
    const language = property === 'name'
      ? (firstName && typeof firstName === 'object' ? Object.keys(firstName)[0] : undefined) ?? this.language
      : false;
    this.typed = [
      ...this.typed.filter(filter => filter.property !== property),
      ...(term ? [{property, fullText: true, language, term}] : []),
    ];
    clearTimeout(this.filterTimer);
    this.filterTimer = setTimeout(() => {
      this.page.set(1);
      void this.fetch();
    }, FILTER_DELAY_MS);
  }

  protected onSort(sort: SortState): void {
    this.sort.set(sort);
    void this.fetch();
  }

  protected onPage(event: PageEvent): void {
    const sizeChanged = event.pageSize !== this.pageSize();
    this.pageSize.set(event.pageSize);
    this.page.set(sizeChanged ? 1 : event.pageIndex + 1);
    void this.fetch();
  }

  protected open(row: ArticleRow): void {
    if (this.linked) void this.router.navigate(['/main/article/details', row._id, 'details-article']);
  }

  private async fetch(): Promise<void> {
    if (!this.categoryId) return;
    const request = ++this.request;
    const sort = this.sort();
    const result = await this.categories.fetchArticles(this.page() - 1, this.pageSize(), {
      sort: sort.dir ? sort : DEFAULT_SORT,
      filter: [{property: 'categories', fullText: false, language: false, term: this.categoryId}, ...this.typed],
      filters: {archived: false, type: ''},
    });
    if (request !== this.request || !result?.success || !result.payload) return;
    this.articles.set(result.payload.items ?? []);
    this.count.set(result.payload.count ?? 0);
  }
}
