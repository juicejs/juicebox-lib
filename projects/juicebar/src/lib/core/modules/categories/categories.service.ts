import {inject, Injectable} from '@angular/core';
import {MediaDetails, MediaFile} from '../../shared/components/media/media.types';
import {Juice} from '../../shared/services/juice.service';
import {Result} from '../../shared/types/Result';
import {buildCategoryTree} from './category-tree';
import {
  Category,
  CategoryArticle,
  CategoryArticlesQuery,
  CategoryCreate,
  CategoryOrder,
  CategoryTreeOptions,
  CategoryUpdate,
  CategoryUsage,
} from './categories.types';

/** The backend refuses a page size of 1000 or more */
const FULL_TREE_PAGE_SIZE = 999;

/**
 * The categories service (`juicecommerce:categories`), as the old juicebox called it. A project with its own category
 * service (e.g. Carl Stahl's `carlstahl:shop:category`) replaces this class through the module's `providers`:
 * `provideCategories({providers: [{provide: CategoriesService, useClass: MyCategoriesService}]})`.
 */
@Injectable({providedIn: 'root'})
export class CategoriesService {
  protected readonly juice = inject(Juice);

  getTree(options: CategoryTreeOptions): Promise<Result<Category[]>> {
    return this.request('getTree', [options]);
  }

  /** The category itself, with its children as deep as `level` */
  getTreeFromNode(categoryId: string, options: CategoryTreeOptions): Promise<Result<Category[]>> {
    return this.request('getTreeFromNode', [categoryId, options]);
  }

  getCategory(categoryId: string): Promise<Result<Category>> {
    return this.request('fetchById', [categoryId, null]);
  }

  fetch(query: unknown[], page: number, pageSize: number, options?: {skipMiddleware?: boolean}): Promise<Result<{items: Category[]; count: number}>> {
    return this.request('fetch', [query, page, pageSize, options]);
  }

  /** Answers the new category's id */
  createCategory(data: CategoryCreate, language: string): Promise<Result<string>> {
    return this.request('createCategory', [data, language]);
  }

  updateCategory(categoryId: string, data: CategoryUpdate, language: string): Promise<Result<Category>> {
    return this.request('updateCategory', [categoryId, data, language]);
  }

  delete(categoryId: string): Promise<Result> {
    return this.request('deleteCategory', [categoryId]);
  }

  updateSiblingOrder(data: CategoryOrder[], parentId?: string, options?: {skipValidation?: boolean}): Promise<Result> {
    return this.request('updateSiblingOrder', [data, parentId, options]);
  }

  /** A category without children: articles go into those */
  async isArticleVariant(categoryId: string, options: CategoryTreeOptions = {}): Promise<boolean> {
    const result = await this.getTreeFromNode(categoryId, {...options, level: 1});
    if (!result?.success || !result.payload?.length) return false;
    return result.payload[0]?.children?.length === 0;
  }

  /** Quality Circle: takes another organisation's category into the user's own ("Mine") */
  addToCustomCategory(categoryId: string): Promise<Result<Category>> {
    return this.request('addToCustomCategory', [categoryId]);
  }

  removeFromCustomCategory(categoryId: string): Promise<Result<Category>> {
    return this.request('removeFromCustomCategory', [categoryId]);
  }

  /**
   * The whole tree with the inactive categories, which `getTree` leaves out below the first level. Quality Circle
   * builds it from the flat list: the `$match` on `active` keeps its backend from adding `{active: true}`, and `$nin`
   * also matches categories without the field.
   */
  async getTreeWithInactive(): Promise<Result<Category[]>> {
    const items: Category[] = [];
    let page = 0;
    let count = 0;
    do {
      const result = await this.fetch([{$match: {active: {$nin: ['__all__']}}}], page, FULL_TREE_PAGE_SIZE, {skipMiddleware: true});
      if (!result?.success) return {success: false, error: result?.error};
      items.push(...(result.payload?.items ?? []));
      count = result.payload?.count ?? 0;
      page++;
    } while (items.length && items.length < count && page < 20);
    return {success: true, payload: buildCategoryTree(items)};
  }

  /** Quality Circle: what still uses the category, per feature; null when it can't tell */
  async getCategoryUsage(categoryId: string): Promise<CategoryUsage | null> {
    const result = await this.juice.request('category:usage:service', 'countUsage', [categoryId]);
    return result?.success && result.payload ? result.payload : null;
  }

  addMedia(categoryId: string, media: MediaFile): Promise<Result> {
    return this.request('addMedia', [categoryId, media]);
  }

  removeMedia(categoryId: string, media: MediaFile): Promise<Result> {
    return this.request('removeMedia', [categoryId, media]);
  }

  updateMedia(categoryId: string, mediaId: string, data: MediaDetails): Promise<Result> {
    return this.request('updateMedia', [categoryId, mediaId, data]);
  }

  /** The articles of the included articles tab, as the old article service fetched them */
  fetchArticles(page: number, pageSize: number, query: CategoryArticlesQuery): Promise<Result<{items: CategoryArticle[]; count: number}>> {
    return this.juice.request('juicecommerce:articles', 'fetch', [page, pageSize, query]);
  }

  protected request<T>(method: string, params: unknown[]): Promise<Result<T>> {
    return this.juice.request('juicecommerce:categories', method, params);
  }
}
