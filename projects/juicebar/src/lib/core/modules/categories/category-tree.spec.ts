import {Category} from './categories.types';
import {buildCategoryTree, findCategory, sortSiblings, toCategoryNodes, withChildren} from './category-tree';

const category = (id: string, extra: Partial<Category> = {}): Category => ({_id: id, name: {en_GB: id}, ...extra});
const label = (item: Category) => (item.name as Record<string, string>)['en_GB'];

describe('category tree', () => {
  it('orders siblings as the old tree: by order, the ones without one last', () => {
    const sorted = sortSiblings([category('c', {order: 2}), category('a'), category('b', {order: '1'})]);
    expect(sorted.map(item => item._id)).toEqual(['b', 'c', 'a']);
    // None has an order: the backend's order stays
    expect(sortSiblings([category('z'), category('y')]).map(item => item._id)).toEqual(['z', 'y']);
  });

  it('groups a flat list by parent, keeping a category whose parent is missing', () => {
    const tree = buildCategoryTree([category('child', {parent_id: 'root'}), category('root'), category('orphan', {parent_id: 'gone'})]);
    expect(tree.map(item => item._id)).toEqual(['root', 'orphan']);
    expect(tree[0].children!.map(item => item._id)).toEqual(['child']);
  });

  it('gives a node its parent\'s organisation when it has none, as Quality Circle\'s tree did', () => {
    const nodes = toCategoryNodes([category('root', {organisation_id: 'org-1', children: [category('child', {active: false})]})], label);
    expect(nodes[0].children![0].data).toEqual({
      active: false, public: false, organisationId: 'org-1', customOrganisationIds: [], leaf: true,
    });
    expect(nodes[0].data!.leaf).toBe(false);
  });

  it('finds a category with its parent and changes children without touching the tree given', () => {
    const tree = [category('root', {children: [category('a'), category('b')]})];
    expect(findCategory(tree, 'b')!.parent!._id).toBe('root');
    expect(findCategory(tree, 'root')!.parent).toBeNull();
    const changed = withChildren(tree, 'root', children => children.filter(item => item._id !== 'a'));
    expect(changed[0].children!.map(item => item._id)).toEqual(['b']);
    expect(tree[0].children!.length).toBe(2);
  });
});
