import {Component, signal, viewChild} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {TreeComponent, TreeNode, TreeNodeDefDirective} from './tree.component';

const NODES: TreeNode<{tag: string}>[] = [
  {key: 'food', label: 'Food', data: {tag: 'f'}, children: [
    {key: 'fruit', label: 'Fruit', data: {tag: 'fr'}, children: [{key: 'apple', label: 'Äpfel', data: {tag: 'a'}}]},
    {key: 'bread', label: 'Bread', data: {tag: 'b'}},
  ]},
  {key: 'tools', label: 'Tools', data: {tag: 't'}},
];

@Component({
  imports: [TreeComponent, TreeNodeDefDirective],
  template: `
    <app-tree [nodes]="nodes()" [filter]="true" filterLabel="Search" emptyMessage="Nothing" (nodeSelect)="picked = $event.key">
      <ng-template [appTreeNodeDef]="nodes()" let-node let-active="active">
        <span class="label">{{ node.label }}</span><button type="button" [attr.tabindex]="active ? 0 : -1">{{ node.data.tag }}</button>
      </ng-template>
    </app-tree>`,
})
class HostComponent {
  readonly tree = viewChild.required(TreeComponent);
  readonly nodes = signal(NODES);
  picked: string | null = null;
}

describe('TreeComponent', () => {
  async function setup() {
    TestBed.configureTestingModule({imports: [HostComponent]});
    const fixture = TestBed.createComponent(HostComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const items = () => Array.from(element.querySelectorAll<HTMLElement>('[role="treeitem"]'));
    const labels = () => items().map(item => item.querySelector('.label')!.textContent);
    const item = (key: string) => items().find(candidate => candidate.dataset['key'] === key)!;
    const press = async (key: string, target: HTMLElement) => {
      target.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles: true}));
      await fixture.whenStable();
    };
    const filter = async (text: string) => {
      const input = element.querySelector<HTMLInputElement>('input[aria-label="Search"]')!;
      input.value = text;
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };
    return {fixture, host: fixture.componentInstance, element, items, labels, item, press, filter};
  }

  it('shows the first level closed, with its level, position and open state for assistive technology', async () => {
    const {labels, item} = await setup();
    expect(labels()).toEqual(['Food', 'Tools']);
    expect(item('food').getAttribute('aria-expanded')).toBe('false');
    expect(item('food').getAttribute('aria-level')).toBe('1');
    expect(item('tools').getAttribute('aria-posinset')).toBe('2');
    expect(item('tools').hasAttribute('aria-expanded')).toBe(false);
  });

  it('opens and closes with the arrow keys and moves between the visible nodes', async () => {
    const {labels, item, press} = await setup();
    await press('ArrowRight', item('food'));
    expect(labels()).toEqual(['Food', 'Fruit', 'Bread', 'Tools']);
    await press('ArrowRight', item('food'));
    expect(document.activeElement).toBe(item('fruit'));
    await press('ArrowLeft', item('fruit'));
    expect(document.activeElement).toBe(item('food'));
    await press('ArrowLeft', item('food'));
    expect(labels()).toEqual(['Food', 'Tools']);
    await press('End', item('food'));
    expect(document.activeElement).toBe(item('tools'));
  });

  it('has one tab stop, which the node template gets for its controls', async () => {
    const {items, item, press} = await setup();
    expect(items().map(row => row.tabIndex)).toEqual([0, -1]);
    expect(item('food').querySelector('button')!.tabIndex).toBe(0);
    await press('ArrowDown', item('food'));
    expect(items().map(row => row.tabIndex)).toEqual([-1, 0]);
    expect(item('food').querySelector('button')!.tabIndex).toBe(-1);
  });

  it('selects with a click or Enter, but not with keys pressed on a control inside', async () => {
    const {host, item, press} = await setup();
    item('tools').click();
    expect(host.picked).toBe('tools');
    await press('Enter', item('food'));
    expect(host.picked).toBe('food');
    host.picked = null;
    await press('Enter', item('food').querySelector('button')!);
    expect(host.picked).toBeNull();
  });

  it('filters like the old tree: matches keep what is below them, their parents open, accents are ignored', async () => {
    const {labels, filter, element} = await setup();
    await filter('apfel');
    expect(labels()).toEqual(['Food', 'Fruit', 'Äpfel']);
    await filter('fruit');
    // A match keeps its children, closed
    expect(labels()).toEqual(['Food', 'Fruit']);
    await filter('zzz');
    expect(element.querySelector('.tree-empty')!.textContent).toContain('Nothing');
  });

  it('brings back what was open before the filter', async () => {
    const {labels, filter, host, fixture} = await setup();
    host.tree().expand('food');
    await fixture.whenStable();
    await filter('apfel');
    await filter('');
    expect(labels()).toEqual(['Food', 'Fruit', 'Bread', 'Tools']);
  });
});
