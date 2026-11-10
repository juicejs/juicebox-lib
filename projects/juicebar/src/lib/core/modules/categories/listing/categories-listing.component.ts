import {Component, computed, inject, OnDestroy, OnInit, signal, viewChild} from '@angular/core';
import {Location} from '@angular/common';
import {Router} from '@angular/router';
import {
  ButtonComponent,
  DialogService,
  IconComponent,
  SegmentedComponent,
  SegmentedOption,
  SlideToggleComponent,
  TooltipDirective,
  TreeComponent,
  TreeNode,
  TreeNodeDefDirective,
} from '../../../../ui-components';
import {ConfirmationDialogComponent, ConfirmationDialogData} from '../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import {injectListingPane, ListingStateService} from '../../../shared/components/listing-pane/listing-pane';
import {AutoLanguagePipe} from '../../../shared/pipes/auto-language.pipe';
import {ConfigurationService} from '../../../shared/services/configuration.service';
import {Juice} from '../../../shared/services/juice.service';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {
  CategoriesConfiguration,
  deleteRestricted,
  injectCategoriesOptions,
  loadCategoriesConfiguration,
  loadRelatedOrganisations,
  SUPER_ADMIN,
} from '../categories-shared';
import {CategoriesService} from '../categories.service';
import {Category} from '../categories.types';
import {CategoryNode, CategoryNodeData, findCategory, sortSiblings, toCategoryNodes, withChildren} from '../category-tree';
import {ChildCategoryDialogComponent, ChildCategoryDialogData} from '../child-category-dialog/child-category-dialog.component';
import {CategoriesTranslationPipe} from '../i18n/categories.translation';

/** Quality Circle's "Show categories" filter */
type Display = 'mine' | 'organisation' | 'all';

interface CategoryRowData extends CategoryNodeData {
  deletable: boolean;
  addable: boolean;
  /** Quality Circle: a category of an organisation outside the user's tree gets no subcategories */
  addDisabled: boolean;
  /** Quality Circle: taken into the user's own categories */
  inMine: boolean;
}

type CategoryRow = TreeNode<CategoryRowData>;

/** What the listing shows, kept for the compact tree next to an open category */
interface CategoriesListingState {
  showInactive: boolean;
  display: Display;
}

/**
 * The category tree with a filter. A click opens a category; its buttons add a subcategory and delete it. The tree is
 * updated in place, as in the old listing: after a delete the siblings are renumbered on the backend. Quality
 * Circle's extras come with the backend configuration (showPublic: the Mine / Organisation / All filter and taking
 * categories into Mine) and the options (showInactive). Next to an open category (the split view) it is the compact
 * tree, as the listing showed it last, without the buttons.
 */
@Component({
  selector: 'app-categories-listing',
  templateUrl: './categories-listing.component.html',
  styleUrl: './categories-listing.component.scss',
  imports: [
    TreeComponent,
    TreeNodeDefDirective,
    ButtonComponent,
    IconComponent,
    TooltipDirective,
    SegmentedComponent,
    SlideToggleComponent,
    CategoriesTranslationPipe,
  ],
  providers: [CategoriesTranslationPipe],
})
export class CategoriesListingComponent implements OnInit, OnDestroy {
  /** Set when this is the compact tree next to an open category, not the page itself */
  protected readonly pane = injectListingPane();
  private readonly listingState = inject(ListingStateService);
  private readonly categories = inject(CategoriesService);
  private readonly configuration = inject(ConfigurationService);
  private readonly juice = inject(Juice);
  private readonly juicebox = inject(JuiceboxService);
  private readonly dialog = inject(DialogService);
  private readonly router = inject(Router);
  private readonly addressBar = inject(Location);
  private readonly i18n = inject(CategoriesTranslationPipe);
  private readonly autoLanguage = new AutoLanguagePipe(this.juicebox);
  private readonly language = this.juicebox.getLanguage();
  private readonly systemLanguages = this.juicebox.getAllSystemLanguages();
  protected readonly options = injectCategoriesOptions();
  private readonly tree = viewChild(TreeComponent);

  private readonly canCreate = !!this.juicebox.hasPermission('categories:role#create');
  private readonly canDelete = !!this.juicebox.hasPermission('categories:role#delete');
  private readonly superAdmin = !!this.juicebox.hasPermission(SUPER_ADMIN);

  protected readonly loading = signal(true);
  protected readonly showInactive = signal(false);
  protected readonly display = signal<Display>('mine');
  protected readonly displayOptions: SegmentedOption<Display>[] = (['mine', 'organisation', 'all'] as const)
    .map(value => ({value, label: this.i18n.transform(value)}));
  protected readonly config = signal<CategoriesConfiguration>({});
  private readonly categoryTree = signal<Category[]>([]);
  private readonly organisationId = signal<string | null>(null);
  private readonly relatedOrganisations = signal<string[] | null>(null);

  protected readonly nodes = computed<CategoryRow[]>(() => {
    const config = this.config();
    let nodes = toCategoryNodes(this.categoryTree(), category =>
      this.autoLanguage.transform(category.name, this.language, this.systemLanguages));
    if (config.showPublic) nodes = this.shown(nodes, this.display());
    return this.withActions(nodes, config);
  });

  async ngOnInit(): Promise<void> {
    if (this.pane) {
      const state = this.listingState.restore<CategoriesListingState>('categories');
      if (state) {
        this.showInactive.set(state.showInactive);
        this.display.set(state.display);
      }
    } else {
      this.juicebox.navigationEvent({
        location: this.i18n.transform('categories'),
        subject: this.i18n.transform('categories_tree'),
        link: '',
      });
      this.juicebox.setActionButtons([{
        title: this.i18n.transform('create'),
        type: 'btn-primary',
        icon: 'add',
        permissions: 'categories:role#create',
        callback: () => this.router.navigate(['/main/categories/category-wizard']),
      }]);
    }

    const [config, organisation] = await Promise.all([
      loadCategoriesConfiguration(this.configuration),
      this.juicebox.getLoggedInOrganisation(),
    ]);
    this.config.set(config);
    this.organisationId.set(organisation?._id ?? null);
    await this.load();
    if (config.showPublic) this.relatedOrganisations.set(await loadRelatedOrganisations(this.juice));
  }

  ngOnDestroy(): void {
    if (this.pane) return;
    this.listingState.save('categories', {
      showInactive: this.showInactive(),
      display: this.display(),
    } satisfies CategoriesListingState);
  }

  protected open(node: TreeNode): void {
    const url = this.router.serializeUrl(this.router.createUrlTree(['/main/categories/details', node.key, 'details-category']));
    if (this.config().openCategoriesInNewTab) window.open(this.addressBar.prepareExternalUrl(url), '_blank');
    else void this.router.navigateByUrl(url);
  }

  protected async toggleInactive(showInactive: boolean): Promise<void> {
    if (this.loading()) return;
    this.showInactive.set(showInactive);
    await this.load();
  }

  protected addChild(node: CategoryRow): void {
    const parent = findCategory(this.categoryTree(), node.key)?.category;
    if (!parent) return;
    this.tree()?.expand(node.key);
    const data: ChildCategoryDialogData = {
      parentId: parent._id,
      order: parent.children?.length ?? 0,
      showPublic: !!this.config().showPublic,
    };
    this.dialog
      .open<ChildCategoryDialogComponent, ChildCategoryDialogData, string>(ChildCategoryDialogComponent, {data, disableClose: true})
      .closed.subscribe(async id => {
        if (!id) return;
        const result = await this.categories.getTreeFromNode(id, {
          level: null,
          ...(this.options.showInactive && {showInactive: true}),
        });
        if (!result?.success) {
          await this.load();
          return;
        }
        // Added without loading the tree again
        this.categoryTree.update(tree => withChildren(tree, parent._id, children => [...children, ...(result.payload ?? [])]));
      });
  }

  protected remove(node: CategoryRow): void {
    const data: ConfirmationDialogData = {
      subject: this.i18n.transform('category'),
      action: this.i18n.transform('delete'),
      confirm: 'delete',
      destructive: true,
    };
    this.dialog
      .open<ConfirmationDialogComponent, ConfirmationDialogData, boolean>(ConfirmationDialogComponent, {data})
      .closed.subscribe(async confirmed => {
        if (!confirmed) return;
        const deleted = await this.categories.delete(node.key);
        if (!deleted?.success) {
          this.juicebox.showToast('error', this.i18n.transform('category_delete_failed'));
          return;
        }
        const parent = findCategory(this.categoryTree(), node.key)?.parent;
        if (parent) {
          const siblings = sortSiblings(parent.children ?? []).filter(child => child._id !== node.key);
          this.categoryTree.update(tree => withChildren(tree, parent._id, () => siblings));
          if (siblings.length) await this.renumber(parent._id, siblings);
        } else {
          await this.load();
        }
        this.juicebox.showToast('success', this.i18n.transform('category_deleted'));
      });
  }

  protected async removeFromMine(node: CategoryRow): Promise<void> {
    const result = await this.categories.removeFromCustomCategory(node.key);
    if (!result?.success) {
      this.juicebox.showToast('error', this.i18n.transform('category_remove_failed'));
      return;
    }
    await this.load();
    this.display.set('mine');
    this.juicebox.showToast('success', this.i18n.transform('category_removed_from_mine'));
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    const result = this.showInactive()
      ? await this.categories.getTreeWithInactive()
      : await this.categories.getTree({filter: [], level: null});
    this.loading.set(false);
    if (!result?.success) {
      console.error('Failed fetching categories', result?.error);
      return;
    }
    this.categoryTree.set(result.payload ?? []);
  }

  /** As the old listing did after a delete: the siblings get the positions they are shown in */
  private async renumber(parentId: string, siblings: Category[]): Promise<void> {
    const order = siblings.map((category, index) => ({categoryId: category._id, order: index}));
    const result = await this.categories.updateSiblingOrder(order, parentId, {skipValidation: true});
    if (!result?.success) {
      this.juicebox.showToast('error', this.i18n.transform('reorder_failed'));
      return;
    }
    this.categoryTree.update(tree => withChildren(tree, parentId, children => children.map(child =>
      ({...child, order: order.find(entry => entry.categoryId === child._id)?.order ?? child.order}))));
  }

  /** Quality Circle filters the first level by the organisation that owns a category */
  private shown(nodes: CategoryNode[], display: Display): CategoryNode[] {
    const organisationId = this.organisationId();
    const related = this.relatedOrganisations() ?? [];
    if (display === 'organisation') return nodes.filter(node => related.includes(node.data.organisationId ?? ''));
    if (display === 'mine') {
      return nodes.filter(node =>
        node.data.organisationId === organisationId || node.data.customOrganisationIds.includes(organisationId ?? ''));
    }
    return nodes;
  }

  private withActions(nodes: CategoryNode[], config: CategoriesConfiguration): CategoryRow[] {
    const organisationId = this.organisationId();
    const related = this.relatedOrganisations();
    const restricted = deleteRestricted(config);
    return nodes.map(node => {
      const data = node.data;
      // Quality Circle (allowRootDelete): a user deletes their organisation's categories without children
      const deletable = config.allowRootDelete
        ? (restricted && this.superAdmin) || (this.canDelete && data.organisationId === organisationId && data.leaf)
        : this.canDelete && !(restricted && !this.superAdmin);
      return {
        ...node,
        children: this.withActions(node.children ?? [], config),
        data: {
          ...data,
          deletable,
          addable: this.canCreate,
          addDisabled: !!config.showPublic && !!related && !!data.organisationId && !related.includes(data.organisationId),
          inMine: !!organisationId && data.customOrganisationIds.includes(organisationId),
        },
      };
    });
  }
}
