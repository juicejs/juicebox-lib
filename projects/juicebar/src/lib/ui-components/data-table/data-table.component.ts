import {
  Component,
  ChangeDetectionStrategy,
  ContentChildren,
  QueryList,
  TemplateRef,
  computed,
  input,
  output,
  AfterContentInit,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkTableModule } from '@angular/cdk/table';
import { PaginatorComponent, PageEvent } from '../paginator/paginator.component';
import { IconComponent } from '../icon/icon.component';
import { CellDefDirective, HeaderDefDirective } from './cell-def.directive';
import { ColumnConfig, SortDir, SortState } from './data-table.types';

@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  pageChange = output<PageEvent>();
  rowClick = output<any>();
  sortChange = output<SortState>();

  @ContentChildren(CellDefDirective) cellDefs!: QueryList<CellDefDirective>;
  @ContentChildren(HeaderDefDirective) headerDefs!: QueryList<HeaderDefDirective>;

  private cellMap = signal<Map<string, TemplateRef<any>>>(new Map());
  private headerMap = signal<Map<string, TemplateRef<any>>>(new Map());

  columnKeys = computed(() => this.columns().map(c => c.key));

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
  trackRow = (i: number, r: any) => r?._id ?? i;
}
