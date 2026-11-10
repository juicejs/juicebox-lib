import {TreeNode} from '../../../ui-components';
import {Category} from './categories.types';

export interface CategoryNodeData {
  active: boolean;
  public: boolean;
  /** The category's organisation, or its parent's when it has none (Quality Circle) */
  organisationId: string | null;
  customOrganisationIds: string[];
  /** Has no children */
  leaf: boolean;
}

export type CategoryNode = TreeNode<CategoryNodeData>;

const DEFAULT_ORDER = Number.MAX_SAFE_INTEGER;

function orderOf(category: Category): number {
  const order = parseInt(String(category.order), 10);
  return Number.isNaN(order) ? DEFAULT_ORDER : order;
}

/**
 * Siblings in their set order, the ones without one last, as the old tree had them. When none has an order they stay
 * as the backend sent them.
 */
export function sortSiblings(categories: Category[]): Category[] {
  const hasOrder = categories.some(category => orderOf(category) !== DEFAULT_ORDER);
  return hasOrder ? [...categories].sort((a, b) => orderOf(a) - orderOf(b)) : categories;
}

/** Groups a flat list by parent; a category whose parent isn't in the list is a root, so it doesn't vanish */
export function buildCategoryTree(categories: Category[]): Category[] {
  const byId = new Map<string, Category>();
  categories.forEach(category => byId.set(String(category._id), {...category, children: []}));
  const roots: Category[] = [];
  byId.forEach(category => {
    const parent = category.parent_id ? byId.get(String(category.parent_id)) : undefined;
    if (parent) parent.children!.push(category);
    else roots.push(category);
  });
  return roots;
}

/** The tree's nodes, each level in order */
export function toCategoryNodes(
  categories: Category[] | undefined,
  label: (category: Category) => string,
  parentOrganisationId: string | null = null,
): CategoryNode[] {
  return sortSiblings(categories ?? []).map(category => {
    const organisationId = category.organisation_id || parentOrganisationId;
    return {
      key: category._id,
      label: label(category),
      children: toCategoryNodes(category.children, label, organisationId),
      data: {
        active: category.active ?? true,
        public: category.public ?? false,
        organisationId,
        customOrganisationIds: category.custom_category_organisation_ids ?? [],
        leaf: !category.children?.length,
      },
    };
  });
}

/** The category and its parent (null for a root), found by id */
export function findCategory(tree: Category[], id: string, parent: Category | null = null): {category: Category; parent: Category | null} | null {
  for (const category of tree) {
    if (category._id === id) return {category, parent};
    const found = findCategory(category.children ?? [], id, category);
    if (found) return found;
  }
  return null;
}

/** A copy of the tree with the category's children changed */
export function withChildren(tree: Category[], id: string, children: (current: Category[]) => Category[]): Category[] {
  return tree.map(category => category._id === id
    ? {...category, children: children(category.children ?? [])}
    : {...category, children: category.children && withChildren(category.children, id, children)});
}
