import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  Injector,
  ViewEncapsulation,
  TemplateRef,
  afterNextRender,
  booleanAttribute,
  computed,
  contentChild,
  contentChildren,
  effect,
  inject,
  input,
  output,
  signal,
  untracked
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { CdkTableModule } from '@angular/cdk/table';
import { PaginatorComponent, PageEvent } from '../paginator/paginator.component';
import { IconComponent } from '../icon/icon.component';
import { CellDefDirective, CompactRowDefDirective, HeaderDefDirective, SelectionDetailDefDirective } from './cell-def.directive';
import { ColumnConfig, SortDir, SortState } from './data-table.types';
import { ViewportService } from '../viewport/viewport.service';

@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, CdkTableModule, CdkMenu, CdkMenuItem, CdkMenuTrigger, PaginatorComponent, IconComponent]
})
export class DataTableComponent {
  rows = input<any[]>([]);
  columns = input.required<ColumnConfig[]>();
  totalCount = input<number>(0);
  pageSize = input<number>(10);
  pageSizeOptions = input<number[]>([5, 10, 25, 50]);
  pageIndex = input<number>(0);
  sort = input<SortState>({ prop: '', dir: '' });
  detailRowFor = input<(row: any) => boolean>(() => false);
  selectable = input<boolean>(false);
  /** Translated label for the paginator's page size control */
  rowsPerPageLabel = input('Rows per page');
  /** Shown when there are no rows, as ngx-datatable's "No data to display" was */
  emptyMessage = input('No data to display');
  idKey = input<string>('_id');
  clearAriaLabel = input<string>('Clear selection');
  /** Translated label of a row's checkbox (`selectable`) */
  selectAriaLabel = input('Select row');
  /** Translated label of a column's resize handle, followed by the column label */
  resizeAriaLabel = input('Resize column');
  /**
   * A narrow list instead of the table, e.g. next to an open record: each row shows the `compactRowDef` template
   * (or the first column), a click emits `rowClick`, and the paginator only moves a page back and forth
   */
  compact = input(false, { transform: booleanAttribute });
  /** Compact list: the id of the row to mark as the current one */
  activeId = input<unknown>(null);
  /** Phone list: the translated label of the control that sorts the rows */
  sortLabel = input('Sort');

  pageChange = output<PageEvent>();
  rowClick = output<any>();
  sortChange = output<SortState>();
  selectionChange = output<any | null>();

  private readonly cellDefs = contentChildren(CellDefDirective);
  private readonly headerDefs = contentChildren(HeaderDefDirective);
  protected readonly selectionDetailDef = contentChild(SelectionDetailDefDirective);
  protected readonly compactRowDef = contentChild(CompactRowDefDirective);

  private static readonly SELECT_COLUMN: ColumnConfig = {
    key: '__select__', label: '', width: '44px', align: 'center', ellipsis: false
  };

  protected readonly selectedId = signal<any | null>(null);

  private readonly viewportPhone = inject(ViewportService).phone;
  /** On a phone the table is a list of rows: each row's name, its other columns under it and its actions */
  protected readonly phone = signal(this.viewportPhone());
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

  constructor() {
    // The table and the phone list are different elements. When the screen crosses the phone's width, what is typed in
    // the in-header filters goes over to the new ones, as the listing still filters by it.
    effect(() => {
      const phone = this.viewportPhone();
      if (phone === untracked(this.phone)) return;
      const typed = this.headerFilterValues();
      this.phone.set(phone);
      if (typed.size) afterNextRender(() => this.restoreHeaderFilterValues(typed), { injector: this.injector });
    });

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

  /** What is typed in the fields of each `headerDef` template (the in-header filters), by column */
  private headerFilterValues(): Map<string, string[]> {
    const values = new Map<string, string[]>();
    this.host.querySelectorAll<HTMLElement>('[data-dt-filter]').forEach(filter => {
      const typed = Array.from(filter.querySelectorAll<HTMLInputElement>(DataTableComponent.FILTER_FIELDS), field => field.value);
      if (typed.some(Boolean)) values.set(filter.dataset['dtFilter'] ?? '', typed);
    });
    return values;
  }

  private restoreHeaderFilterValues(values: Map<string, string[]>): void {
    this.host.querySelectorAll<HTMLElement>('[data-dt-filter]').forEach(filter => {
      const typed = values.get(filter.dataset['dtFilter'] ?? '');
      filter.querySelectorAll<HTMLInputElement>(DataTableComponent.FILTER_FIELDS).forEach((field, index) => {
        if (typed?.[index]) field.value = typed[index];
      });
    });
  }
  private static readonly FILTER_FIELDS = 'input, select, textarea';

  /** The projected cell and header templates by column key */
  private readonly cellMap = computed(() => new Map<string, TemplateRef<any>>(this.cellDefs().map(d => [d.cellDef(), d.templateRef])));
  private readonly headerMap = computed(() => new Map<string, TemplateRef<any>>(this.headerDefs().map(d => [d.headerDef(), d.templateRef])));

  /** Widths set by dragging a header's edge (px), kept while the table lives */
  private readonly resizedWidths = signal<Record<string, number>>({});
  private resizing: { key: string; startX: number; startWidth: number } | null = null;
  private static readonly MIN_RESIZED_WIDTH = 60;

  columnsForRender = computed(() => {
    const widths = this.resizedWidths();
    const columns = this.selectable() ? [DataTableComponent.SELECT_COLUMN, ...this.columns()] : this.columns();
    return columns.map(column => widths[column.key] ? { ...column, width: `${widths[column.key]}px` } : column);
  });
  columnKeys = computed(() => this.columnsForRender().map(c => c.key));

  /**
   * With table-layout: fixed, columns without a width share what the fixed ones leave over, which is nothing on a
   * narrow screen. A minimum width keeps every column readable; the wrapper then scrolls sideways.
   */
  protected readonly minTableWidth = computed(() =>
    this.columnsForRender().reduce((total, column) => {
      const px = column.width?.endsWith('px') ? parseFloat(column.width) : NaN;
      return total + (Number.isNaN(px) ? DataTableComponent.MIN_FLEX_COLUMN_WIDTH : px);
    }, 0)
  );
  private static readonly MIN_FLEX_COLUMN_WIDTH = 120;

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

  /**
   * What the header and cells of each rendered column show, worked out when the columns, sort or projected templates
   * change rather than on every check
   */
  protected readonly renderColumns = computed(() => {
    const cells = this.cellMap();
    const headers = this.headerMap();
    return this.columnsForRender().map(col => {
      const sortDir = this.sortDirFor(col.key);
      return {
        col,
        sortDir,
        ariaSort: sortDir === 'asc' ? 'ascending' : sortDir === 'desc' ? 'descending' : 'none',
        sortIcon: this.sortIcon(col.key),
        headerTpl: headers.get(col.key) ?? null,
        cellTpl: cells.get(col.key) ?? null,
      };
    });
  });

  /** Template of the `__detail__` cell, for detail rows that don't show the selection toolbar */
  protected readonly detailTpl = computed(() => this.cellMap().get('__detail__') ?? null);

  /** The values each row's plain cells show, by row: worked out when the rows or columns change, not on a selection */
  private readonly rowValues = computed(() => {
    const keys = this.columns().map(column => column.key);
    return new Map<unknown, Record<string, any>>(
      this.rows().map(row => [row, Object.fromEntries(keys.map(key => [key, this.value(row, key)]))])
    );
  });

  /**
   * The table's data source: each data row with its selected state and the values its plain cells show (detail
   * markers pass through). Worked out when the rows, columns or selection change rather than on every check.
   */
  protected readonly renderRows = computed(() => {
    const values = this.rowValues();
    const selectable = this.selectable();
    const sid = this.selectedId();
    const idKey = this.idKey();
    return this.displayedRows().map(r => r?.__detail ? r : {
      row: r,
      selected: selectable && r?.[idKey] === sid,
      values: values.get(r) ?? {},
    });
  });

  /** The compact list's rows: which one is current, and what a row shows without a `compactRowDef` */
  protected readonly listRows = computed(() => {
    const idKey = this.idKey();
    const activeId = this.activeId();
    const firstKey = this.columns()[0]?.key;
    return this.rows().map(row => ({
      row,
      id: row?.[idKey],
      active: activeId != null && row?.[idKey] === activeId,
      label: firstKey ? this.value(row, firstKey) : null,
    }));
  });

  /**
   * The phone list: which column names a row (when there is no `compactRowDef`), which holds its actions, which
   * stand under the name as fields, and which filters and sort choices stand above the rows in place of the header.
   * A column says what it is with `listRole`; otherwise the actions are the column with the key `actions` and the
   * name is the first of the others.
   */
  protected readonly listLayout = computed(() => {
    const columns = this.renderColumns().filter(column => column.col.key !== '__select__');
    const hasRowDef = !!this.compactRowDef();
    const marked = (role: ColumnConfig['listRole']) => columns.find(column => column.col.listRole === role);
    // The actions are their cell template; a column without one is a field like the others
    const actionsColumn = marked('actions') ?? columns.find(column => column.col.key === 'actions');
    const actions = actionsColumn?.cellTpl ? actionsColumn : null;
    const head = hasRowDef ? null : marked('name') ?? columns.find(column => column !== actions) ?? null;
    const fields = columns.filter(column => column !== head && column !== actions && !(hasRowDef && column.col.inCompactRow));
    return {
      head,
      actions,
      ...this.placeFields(fields),
      filters: columns.filter(column => column.headerTpl),
      sortable: columns.filter(column => column.col.sortable),
      sorted: columns.find(column => column.sortDir !== '') ?? null,
    };
  });

  /**
   * The fields under a row's name, in the order they stand: up to three in a line, a wide column (180px or more in
   * the table) taking two places. A field goes into the first line that has room for it, and the last one in a line
   * takes the room that is left, so one field alone has the whole line. The lines are full, so the fields only say
   * how many places they take; they are read (and reached with the keyboard) in the order they are seen.
   */
  private placeFields<T extends { col: ColumnConfig }>(fields: T[]) {
    const max = DataTableComponent.FIELDS_PER_LINE;
    const sizes = fields.map(field => parseFloat(field.col.width ?? '') >= DataTableComponent.WIDE_FIELD_WIDTH ? 2 : 1);
    const perLine = Math.max(1, Math.min(max, sizes.reduce((total, size) => total + size, 0)));
    const lines: { field: T; size: number }[][] = [];
    fields.forEach((field, index) => {
      const size = Math.min(sizes[index], perLine);
      const used = (line: { size: number }[]) => line.reduce((total, placed) => total + placed.size, 0);
      const line = lines.find(candidate => used(candidate) + size <= perLine) ?? lines[lines.push([]) - 1];
      line.push({ field, size });
    });
    for (const line of lines) {
      line[line.length - 1].size += perLine - line.reduce((total, placed) => total + placed.size, 0);
    }
    return {
      fieldsPerLine: perLine,
      fields: lines.flat().map(({ field, size }) => ({ ...field, gridColumn: `span ${size}` })),
    };
  }
  private static readonly FIELDS_PER_LINE = 3;
  private static readonly WIDE_FIELD_WIDTH = 180;

  /**
   * The phone list's rows: the values their plain fields show, whether the row is selected, and whether its detail
   * (the selection toolbar, or the `__detail__` template) stands with it, as the table's detail row does
   */
  protected readonly cardRows = computed(() => {
    const values = this.rowValues();
    const idKey = this.idKey();
    const selectable = this.selectable();
    const selectedId = selectable ? this.selectedId() : null;
    const hasDetail = this.detailRowFor();
    return this.rows().map(row => {
      const selected = selectable && selectedId != null && row?.[idKey] === selectedId;
      return {
        row,
        id: row?.[idKey],
        selected,
        detail: selectable ? selected : hasDetail(row),
        values: values.get(row) ?? {},
      };
    });
  });

  isDetailRow = (_: number, r: any) => !!r?.__detail;
  isDataRow   = (_: number, r: any) => !r?.__detail;

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
    // Ascending, then descending and back, as ngx-datatable did; there is no unsorted step,
    // so a listing never sends the backend an empty sort
    const next: SortDir = this.sortDirFor(col.key) === 'asc' ? 'desc' : 'asc';
    this.sortChange.emit({ prop: col.key, dir: next });
  }

  protected startResize(event: PointerEvent, key: string): void {
    event.preventDefault();
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);
    this.resizing = { key, startX: event.clientX, startWidth: handle.closest('th')!.getBoundingClientRect().width };
  }

  protected onResizeMove(event: PointerEvent): void {
    if (this.resizing) {
      const { key, startX, startWidth } = this.resizing;
      this.setResizedWidth(key, startWidth + event.clientX - startX);
    }
  }

  protected endResize(): void {
    this.resizing = null;
  }

  protected onResizeKey(event: KeyboardEvent, key: string): void {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const width = (event.currentTarget as HTMLElement).closest('th')!.getBoundingClientRect().width;
      this.setResizedWidth(key, width + (event.key === 'ArrowRight' ? 16 : -16));
    }
  }

  private setResizedWidth(key: string, width: number): void {
    this.resizedWidths.update(widths => ({ ...widths, [key]: Math.max(DataTableComponent.MIN_RESIZED_WIDTH, Math.round(width)) }));
  }

  onSortKey(event: KeyboardEvent, col: ColumnConfig): void {
    if (!col.sortable) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleSort(col);
    }
  }

  /** Rows of `renderRows()` are tracked by their row's id, so a row keeps its view when its values or selection change */
  trackRow = (i: number, r: any) => {
    const k = this.idKey();
    return r?.__detail ? `__detail_${r.source?.[k] ?? i}` : (r?.row?.[k] ?? i);
  };
}
