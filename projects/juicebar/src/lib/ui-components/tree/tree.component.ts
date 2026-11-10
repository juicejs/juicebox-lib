import {
  Component,
  Directive,
  ElementRef,
  Injector,
  TemplateRef,
  afterNextRender,
  booleanAttribute,
  computed,
  contentChild,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import {NgTemplateOutlet} from '@angular/common';
import {IconComponent} from '../icon/icon.component';
import {ProgressSpinnerComponent} from '../progress-spinner/progress-spinner.component';

export interface TreeNode<T = unknown> {
  /** Unique in the tree; expansion and focus follow it when the nodes are replaced */
  key: string;
  /** Shown and searched by the filter */
  label: string;
  children?: TreeNode<T>[];
  data?: T;
}

export interface TreeNodeContext<T = unknown> {
  $implicit: TreeNode<T>;
  /** The row that has the keyboard focus (tab stop); controls inside it can take part in the tab order */
  active: boolean;
  level: number;
}

/**
 * A node's content: `<ng-template [appTreeNodeDef]="nodes" let-node let-active="active">…</ng-template>`. The nodes
 * given to it only type `node` in the template.
 */
@Directive({selector: 'ng-template[appTreeNodeDef]'})
export class TreeNodeDefDirective<T = unknown> {
  readonly template = inject<TemplateRef<TreeNodeContext<T>>>(TemplateRef);
  readonly nodes = input<TreeNode<T>[] | ''>('', {alias: 'appTreeNodeDef'});

  static ngTemplateContextGuard<T>(_directive: TreeNodeDefDirective<T>, context: unknown): context is TreeNodeContext<T> {
    return true;
  }
}

interface TreeRow<T> {
  node: TreeNode<T>;
  level: number;
  expandable: boolean;
  expanded: boolean;
  parentKey: string | null;
  position: number;
  setSize: number;
  active: boolean;
  selected: boolean;
}

interface FilteredTree<T> {
  nodes: TreeNode<T>[];
  /** Nodes opened to show the matches inside them */
  expand: Set<string>;
}

/**
 * A tree of nodes that open and close, with an optional filter. The filter keeps the nodes whose label contains the
 * text (accents and case ignored) with everything below them, and opens their parents; clearing it brings back what
 * was open before. Clicking a node or pressing Enter emits `nodeSelect`. Keyboard: arrows move, open and close,
 * Home and End jump.
 */
@Component({
  selector: 'app-tree',
  templateUrl: './tree.component.html',
  styleUrl: './tree.component.scss',
  imports: [NgTemplateOutlet, IconComponent, ProgressSpinnerComponent],
  host: {class: 'app-tree'},
})
export class TreeComponent<T = unknown> {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly nodes = input<TreeNode<T>[]>([]);
  /** Shows a filter field above the tree */
  readonly filter = input(false, {transform: booleanAttribute});
  /** Placeholder and accessible name of the filter field */
  readonly filterLabel = input('');
  readonly loading = input(false, {transform: booleanAttribute});
  /** Shown when there are no nodes, or none matches the filter */
  readonly emptyMessage = input('');
  readonly ariaLabel = input('');
  /** The node to mark as the current one, e.g. the record that is open; the nodes above it are opened */
  readonly selectedKey = input<string | null>(null);

  readonly nodeSelect = output<TreeNode<T>>();

  protected readonly nodeDef = contentChild(TreeNodeDefDirective);
  protected readonly term = signal('');
  /** Open nodes without a filter; the way to the current node opens when the nodes or that node change */
  private readonly expanded = linkedSignal<string[], ReadonlySet<string>>({
    source: () => pathTo(this.nodes(), this.selectedKey()),
    computation: (path, previous) => new Set([...(previous?.value ?? []), ...path]),
  });
  private readonly filtered = computed(() => filterTree(this.nodes(), normalise(this.term())));
  /** Open nodes while filtering: the ones open before and the parents of the matches, until the filter changes */
  private readonly filterExpanded = linkedSignal<ReadonlySet<string>>(
    () => new Set([...this.expanded(), ...this.filtered().expand]),
  );
  private readonly activeKey = signal<string | null>(null);

  protected readonly rows = computed<TreeRow<T>[]>(() => {
    const expanded = this.term() ? this.filterExpanded() : this.expanded();
    const selectedKey = this.selectedKey();
    const rows: TreeRow<T>[] = [];
    const visit = (nodes: TreeNode<T>[], level: number, parentKey: string | null) => {
      nodes.forEach((node, index) => {
        const expandable = !!node.children?.length;
        const open = expandable && expanded.has(node.key);
        rows.push({
          node, level, expandable, expanded: open, parentKey, position: index + 1, setSize: nodes.length,
          active: false, selected: selectedKey != null && node.key === selectedKey,
        });
        if (open) visit(node.children!, level + 1, node.key);
      });
    };
    visit(this.filtered().nodes, 0, null);
    // One tab stop: the focused row, or the first one
    const active = rows.find(row => row.node.key === this.activeKey()) ?? rows[0];
    if (active) active.active = true;
    return rows;
  });

  /** Opens a node, e.g. after adding a child to it */
  expand(key: string): void {
    this.setExpanded(key, true);
  }

  protected onFilter(value: string): void {
    this.term.set(value);
  }

  protected select(row: TreeRow<T>): void {
    this.activeKey.set(row.node.key);
    this.nodeSelect.emit(row.node);
  }

  protected toggle(row: TreeRow<T>): void {
    if (row.expandable) this.setExpanded(row.node.key, !row.expanded);
  }

  protected onFocus(row: TreeRow<T>): void {
    this.activeKey.set(row.node.key);
  }

  protected onKeydown(event: KeyboardEvent, row: TreeRow<T>): void {
    // Keys pressed on a control inside the row (e.g. its buttons) are theirs
    if (event.target !== event.currentTarget) return;
    const rows = this.rows();
    const index = rows.findIndex(candidate => candidate.node.key === row.node.key);
    let target: TreeRow<T> | undefined;
    switch (event.key) {
      case 'ArrowDown':
        target = rows[index + 1];
        break;
      case 'ArrowUp':
        target = rows[index - 1];
        break;
      case 'Home':
        target = rows[0];
        break;
      case 'End':
        target = rows[rows.length - 1];
        break;
      case 'ArrowRight':
        if (row.expandable && !row.expanded) this.setExpanded(row.node.key, true);
        else if (row.expanded) target = rows[index + 1];
        break;
      case 'ArrowLeft':
        if (row.expanded) this.setExpanded(row.node.key, false);
        else if (row.parentKey) target = rows.find(candidate => candidate.node.key === row.parentKey);
        break;
      case 'Enter':
      case ' ':
        this.select(row);
        break;
      default:
        return;
    }
    event.preventDefault();
    if (target) this.focus(target.node.key);
  }

  private setExpanded(key: string, open: boolean): void {
    const state = this.term() ? this.filterExpanded : this.expanded;
    state.update(keys => {
      const next = new Set(keys);
      if (open) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  private focus(key: string): void {
    this.activeKey.set(key);
    afterNextRender(() => {
      const rows = this.host.nativeElement.querySelectorAll<HTMLElement>('[role="treeitem"]');
      Array.from(rows).find(row => row.dataset['key'] === key)?.focus();
    }, {injector: this.injector});
  }
}

function normalise(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase().trim();
}

/** The keys of the nodes above `key`, from the root down; empty when it is a root or not in the tree */
function pathTo<T>(nodes: TreeNode<T>[], key: string | null): string[] {
  if (key == null) return [];
  for (const node of nodes) {
    if (node.key === key) return [];
    const children = node.children ?? [];
    if (children.some(child => child.key === key)) return [node.key];
    const below = pathTo(children, key);
    if (below.length) return [node.key, ...below];
  }
  return [];
}

/** The nodes that match with all below them, and the nodes on the way to a match */
function filterTree<T>(nodes: TreeNode<T>[], term: string): FilteredTree<T> {
  const expand = new Set<string>();
  if (!term) return {nodes, expand};
  const visit = (node: TreeNode<T>): TreeNode<T> | null => {
    if (normalise(node.label).includes(term)) return node;
    const children = (node.children ?? []).map(visit).filter((child): child is TreeNode<T> => !!child);
    if (!children.length) return null;
    expand.add(node.key);
    return {...node, children};
  };
  return {nodes: nodes.map(visit).filter((node): node is TreeNode<T> => !!node), expand};
}
