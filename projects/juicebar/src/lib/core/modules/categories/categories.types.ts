import {MediaFile, PerLanguage} from '../../shared/components/media/media.types';
import {ISearchTerm} from '../../shared/interfaces/ISearchTerm';
import {ISort} from '../../shared/interfaces/ISort';

/** A category of `juicecommerce:categories`; the tree calls fill in `children` */
export interface Category {
  _id: string;
  name: PerLanguage | string;
  description?: PerLanguage | string;
  /** The backend stores a number; older categories may have a numeric string */
  order?: number | string | null;
  active?: boolean;
  /** Quality Circle: shown to other organisations */
  public?: boolean;
  parent_id?: string | null;
  slug?: PerLanguage;
  /** e.g. 'no_category', which cannot be saved */
  type?: string;
  attributes?: Record<string, unknown>;
  media?: MediaFile[];
  children?: Category[];
  organisation_id?: string;
  /** Quality Circle: the organisations that took this category into their own ("Mine") */
  custom_category_organisation_ids?: string[];
  created?: string;
  updated?: string;
}

/** A category's fields, in the language given with them */
export interface CategoryUpdate {
  name: string;
  description?: string | null;
  order?: number | string | null;
  active?: boolean;
  public?: boolean;
}

/** A new category; a subcategory has its parent */
export interface CategoryCreate extends CategoryUpdate {
  parent_id?: string;
}

export interface CategoryTreeOptions {
  filter?: ISearchTerm[];
  /** How deep the children go, from 0 (the first level); null for all */
  level?: number | null;
  showInactive?: boolean;
}

/** A sibling's new position (`updateSiblingOrder`) */
export interface CategoryOrder {
  categoryId: string;
  order: number;
}

/** Per feature, the records still using a category (Quality Circle's `category:usage:service`) */
export interface CategoryUsage {
  qualifications: number;
  modules: number;
  trainings: number;
  educations: number;
  templates: number;
  occupations: number;
  functions: number;
}

/** An article of `juicecommerce:articles`, as the included articles tab lists it */
export interface CategoryArticle {
  _id: string;
  name: PerLanguage | string;
  active?: boolean;
  public?: boolean;
  type?: string;
  attributes?: {sapId?: string; privacyReason?: unknown[]} & Record<string, unknown>;
}

export interface CategoryArticlesQuery {
  sort: ISort;
  filter: ISearchTerm[];
  filters: {archived: boolean; type: string};
}
