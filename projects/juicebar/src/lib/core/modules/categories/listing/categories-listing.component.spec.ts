import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {of} from 'rxjs';
import {CATEGORIES_CUSTOMIZATION, CategoriesCustomization} from '../../../../config/base-app.config';
import {provideJuicebarTesting, signInTestUser} from '../../../../../testing/juicebar-testing';
import {DialogService} from '../../../../ui-components';
import {ConfigurationService} from '../../../shared/services/configuration.service';
import {Juice} from '../../../shared/services/juice.service';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {CategoriesService} from '../categories.service';
import {Category} from '../categories.types';
import {CategoriesTranslationPipe} from '../i18n/categories.translation';
import {CategoriesListingComponent} from './categories-listing.component';

const tree = (): Category[] => [
  {_id: 'food', name: {en_GB: 'Food'}, organisation_id: 'org-1', children: [
    {_id: 'fruit', name: {en_GB: 'Fruit'}, order: 0, children: []},
    {_id: 'bread', name: {en_GB: 'Bread'}, order: 1, children: []},
    {_id: 'milk', name: {en_GB: 'Milk'}, order: 2, children: []},
  ]},
  {_id: 'tools', name: {en_GB: 'Tools'}, organisation_id: 'org-2', children: []},
];

interface Setup {
  permissions?: string[];
  config?: Record<string, unknown>;
  customization?: CategoriesCustomization;
  dialogResult?: unknown;
}

describe('CategoriesListingComponent', () => {
  async function setup({permissions = ['categories:role#create', 'categories:role#delete'], config = {}, customization = {}, dialogResult = true}: Setup = {}) {
    TestBed.configureTestingModule({
      imports: [CategoriesListingComponent],
      providers: [
        ...provideJuicebarTesting(),
        provideRouter([{path: '**', children: []}]),
        CategoriesTranslationPipe,
        {provide: CATEGORIES_CUSTOMIZATION, useValue: customization},
      ],
    });
    signInTestUser();
    const juicebox = TestBed.inject(JuiceboxService);
    vi.spyOn(juicebox, 'hasPermission').mockImplementation(permission => permissions.includes(permission));
    vi.spyOn(juicebox, 'getLoggedInOrganisation').mockResolvedValue({_id: 'org-1'});
    vi.spyOn(TestBed.inject(ConfigurationService), 'getByKey').mockResolvedValue({success: true, payload: {options: config}});
    vi.spyOn(TestBed.inject(Juice), 'request').mockResolvedValue(['org-1']);
    const dialog = vi.spyOn(TestBed.inject(DialogService), 'open').mockReturnValue({closed: of(dialogResult)} as any);
    const categories = TestBed.inject(CategoriesService);
    const getTree = vi.spyOn(categories, 'getTree').mockResolvedValue({success: true, payload: tree()});
    const getTreeWithInactive = vi.spyOn(categories, 'getTreeWithInactive').mockResolvedValue({success: true, payload: tree()});
    const remove = vi.spyOn(categories, 'delete').mockResolvedValue({success: true});
    const reorder = vi.spyOn(categories, 'updateSiblingOrder').mockResolvedValue({success: true});
    const getTreeFromNode = vi.spyOn(categories, 'getTreeFromNode').mockResolvedValue({success: true, payload: [
      {_id: 'cheese', name: {en_GB: 'Cheese'}, order: 3, children: []},
    ]});

    const fixture = TestBed.createComponent(CategoriesListingComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const item = (key: string) => element.querySelector<HTMLElement>(`[role="treeitem"][data-key="${key}"]`);
    const button = (key: string, label: string) => item(key)?.querySelector<HTMLButtonElement>(`[aria-label^="${label}"]`) ?? null;
    const open = async (key: string) => {
      item(key)!.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight'}));
      await fixture.whenStable();
    };
    const settle = async () => {
      for (let step = 0; step < 3; step++) await new Promise(resolve => setTimeout(resolve));
      await fixture.whenStable();
    };
    return {fixture, element, item, button, open, settle, dialog, getTree, getTreeWithInactive, remove, reorder, getTreeFromNode};
  }

  it('loads the whole tree as the old listing did', async () => {
    const {getTree, item, open} = await setup();
    expect(getTree).toHaveBeenCalledWith({filter: [], level: null});
    await open('food');
    expect(item('milk')).not.toBeNull();
  });

  it('after a delete, renumbers the siblings on the backend as the old listing did', async () => {
    const {button, open, remove, reorder, item, settle} = await setup();
    await open('food');
    button('bread', 'delete')!.click();
    await settle();
    expect(remove).toHaveBeenCalledWith('bread');
    expect(reorder).toHaveBeenCalledWith(
      [{categoryId: 'fruit', order: 0}, {categoryId: 'milk', order: 1}], 'food', {skipValidation: true});
    expect(item('bread')).toBeNull();
  });

  it('loads the tree again after deleting a first-level category, which the old listing crashed on', async () => {
    const {button, getTree, reorder, settle} = await setup();
    button('tools', 'delete')!.click();
    await settle();
    expect(getTree).toHaveBeenCalledTimes(2);
    expect(reorder).not.toHaveBeenCalled();
  });

  it('adds a subcategory at the parent\'s end and shows it without loading the tree again', async () => {
    const {button, dialog, getTreeFromNode, getTree, item, settle} = await setup({dialogResult: 'cheese'});
    button('food', 'Add a subcategory')!.click();
    await settle();
    expect(dialog.mock.calls[0][1]).toEqual(expect.objectContaining({data: {parentId: 'food', order: 3, showPublic: false}}));
    expect(getTreeFromNode).toHaveBeenCalledWith('cheese', {level: null});
    expect(getTree).toHaveBeenCalledTimes(1);
    expect(item('cheese')).not.toBeNull();
  });

  it('shows delete only with the permission, and with allowDelete off only to super admins', async () => {
    expect((await setup({permissions: []})).button('food', 'delete')).toBeNull();
    TestBed.resetTestingModule();
    expect((await setup({config: {allowDelete: false}})).button('food', 'delete')).toBeNull();
    TestBed.resetTestingModule();
    const superAdmin = await setup({config: {allowDelete: false}, permissions: ['categories:role#delete', 'categories:role#super-admin']});
    expect(superAdmin.button('food', 'delete')).not.toBeNull();
  });

  it('Quality Circle (allowRootDelete): a user deletes their organisation\'s categories without children', async () => {
    const {button, open} = await setup({config: {allowDelete: false, allowRootDelete: true}});
    await open('food');
    // Food has children; Fruit inherits Food's organisation; Tools is another organisation's
    expect(button('food', 'delete')).toBeNull();
    expect(button('fruit', 'delete')).not.toBeNull();
    expect(button('tools', 'delete')).toBeNull();
  });

  it('Quality Circle (showPublic): shows the user\'s categories first and the others on request', async () => {
    const {item, fixture} = await setup({config: {showPublic: true}});
    expect(item('food')).not.toBeNull();
    expect(item('tools')).toBeNull();
    // The filter's select sets this
    (fixture.componentInstance as any).display.set('all');
    await fixture.whenStable();
    expect(item('tools')).not.toBeNull();
  });

  it('Quality Circle (showInactive): the switch loads the tree with the inactive categories', async () => {
    const {element, getTreeWithInactive, settle} = await setup({customization: {options: {showInactive: true}}});
    element.querySelector<HTMLElement>('app-slide-toggle button, app-slide-toggle input')!.click();
    await settle();
    expect(getTreeWithInactive).toHaveBeenCalled();
  });
});
