import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  ContentChild,
  ContentChildren,
  QueryList,
  TemplateRef,
  computed,
  effect,
  input,
  output,
  AfterContentInit,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkTableModule } from '@angular/cdk/table';
import { PaginatorComponent, PageEvent } from '../paginator/paginator.component';
import { IconComponent } from '../icon/icon.component';
import { CellDefDirective, HeaderDefDirective, SelectionDetailDefDirective } from './cell-def.directive';
import { ColumnConfig, SortDir, SortState } from './data-table.types';

@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, CdkTableModule, PaginatorComponent, IconComponent]
})
export class DataTableComponent implements AfterContentInit {
  rows = input<any[]>([]);
  columns = input.required<ColumnConfig[]>();
  totalCount = input<number>(0);
  pageSize = input<number>(10);
  pageSizeOptions = input<number[]>([5, 10, 25, 50]);
  pageIndex = input<number>(0);
  sort = input<SortState>({ prop: '', dir: '' });
  detailRowFor = input<(row: any) => boolean>(() => false);
  selectable = input<boolean>(false);
  idKey = input<string>('_id');
  clearAriaLabel = input<string>('Clear selection');

  pageChange = output<PageEvent>();
  rowClick = output<any>();
  sortChange = output<SortState>();
  selectionChange = output<any | null>();

  @ContentChildren(CellDefDirective) cellDefs!: QueryList<CellDefDirective>;
  @ContentChildren(HeaderDefDirective) headerDefs!: QueryList<HeaderDefDirective>;
  @ContentChild(SelectionDetailDefDirective) selectionDetailDef?: SelectionDetailDefDirective;

  private static readonly SELECT_COLUMN: ColumnConfig = {
    key: '__select__', label: '', width: '44px', align: 'center', ellipsis: false
  };

  protected readonly selectedId = signal<any | null>(null);

  constructor() {
    effect(() => {
      this.rows();
      this.selectedId.set(null);
    });

    effect(() => {
      const sid = this.selectedId();
      const row = sid == null ? null : this.rows().find(r => r?.[this.idKey()] === sid) ?? null;
      this.selectionChange.emit(row);
    });
  }

  isRowSelected(row: any): boolean {
    return this.selectable() && row?.[this.idKey()] === this.selectedId();
  }

  toggleRow(row: any): void {
    const id = row?.[this.idKey()];
    this.selectedId.update(curr => curr === id ? null : id);
  }

  clearSelection(): void {
    this.selectedId.set(null);
  }

  private cellMap = signal<Map<string, TemplateRef<any>>>(new Map());
  private headerMap = signal<Map<string, TemplateRef<any>>>(new Map());

  columnsForRender = computed(() =>
    this.selectable() ? [DataTableComponent.SELECT_COLUMN, ...this.columns()] : this.columns()
  );
  columnKeys = computed(() => this.columnsForRender().map(c => c.key));

  displayedRows = computed(() => {
    const userPredicate = this.detailRowFor();
    const selectable = this.selectable();
    const sid = selectable ? this.selectedId() : null;
    const idKey = this.idKey();
    const out: any[] = [];
    for (const r of this.rows()) {
      const match = selectable ? (sid != null && r?.[idKey] === sid) : userPredicate(r);
      if (match) out.push({ __detail: true, source: r });
      out.push(r);
    }
    return out;
  });

  isDetailRow = (_: number, r: any) => !!r?.__detail;
  isDataRow   = (_: number, r: any) => !r?.__detail;

  ngAfterContentInit(): void {
    this.refresh();
    this.cellDefs.changes.subscribe(() => this.refresh());
    this.headerDefs.changes.subscribe(() => this.refresh());
  }

  private refresh(): void {
    const c = new Map<string, TemplateRef<any>>();
    this.cellDefs.forEach(d => c.set(d.cellDef(), d.templateRef));
    this.cellMap.set(c);

    const h = new Map<string, TemplateRef<any>>();
    this.headerDefs.forEach(d => h.set(d.headerDef(), d.templateRef));
    this.headerMap.set(h);
  }

  cellTpl(key: string): TemplateRef<any> | null { return this.cellMap().get(key) ?? null; }
  headerTpl(key: string): TemplateRef<any> | null { return this.headerMap().get(key) ?? null; }

  value(row: any, key: string): any {
    if (row == null) return null;
    if (key.indexOf('.') === -1) return row[key];
    return key.split('.').reduce((a, p) => (a == null ? a : a[p]), row);
  }

  sortDirFor(key: string): SortDir {
    const s = this.sort();
    if (!s || s.prop !== key) return '';
    return s.dir === 'asc' || s.dir === 'desc' ? s.dir : '';
  }

  sortIcon(key: string): string {
    const dir = this.sortDirFor(key);
    if (dir === 'asc') return 'arrow_upward';
    if (dir === 'desc') return 'arrow_downward';
    return 'unfold_more';
  }

  toggleSort(col: ColumnConfig): void {
    if (!col.sortable) return;
    const current = this.sortDirFor(col.key);
    const next: SortDir = current === '' ? 'asc' : current === 'asc' ? 'desc' : '';
    this.sortChange.emit({ prop: next === '' ? '' : col.key, dir: next });
  }

  onSortKey(event: KeyboardEvent, col: ColumnConfig): void {
    if (!col.sortable) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleSort(col);
    }
  }

  trackKey = (_: number, c: ColumnConfig) => c.key;
  trackRow = (i: number, r: any) => {
    const k = this.idKey();
    return r?.__detail ? `__detail_${r.source?.[k] ?? i}` : (r?.[k] ?? i);
  };
}
