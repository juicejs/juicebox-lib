# DataTableComponent

Shared listing table. Wraps `cdk-table` + `app-paginator`. You give it rows + columns, it gives you sticky sticky-header table with ellipsis cells, pagination (10 default, options 5/10/25/50), and responsive horizontal scroll. Anything beyond plain text — icons, action buttons, pipes, tooltips, permission directives, in-header filter inputs — goes in your own `<ng-template>` projected by key.

> Use this for every listing screen. Do **not** hand-roll `<table cdk-table>` in features anymore.

---

## When to use it

- ✅ Server-paginated listing of records (users, exports, orders, …).
- ✅ Mix of plain text columns + a few custom cells.
- ✅ Filter UI lives above the table (use `FilterBarComponent`) or inside header cells (use `*headerDef`).
- ❌ Inline-edit grids, drag-drop reorder, tree/expandable rows, multi-row selection — fall back to raw `cdk-table`.

---

## 1. Import

```ts
import {
  DataTableComponent,
  CellDefDirective,
  HeaderDefDirective,
  ColumnConfig
} from '../../../../ui-components';

@Component({
  // ...
  imports: [
    CommonModule,
    SharedModule,
    DataTableComponent,
    CellDefDirective,
    HeaderDefDirective,   // only if you project header templates
    // your translation pipe + any directives used inside cellDef templates
  ]
})
```

---

## 2. Define columns in the component class

```ts
columns: ColumnConfig[] = [
  { key: 'name',              label: this.i18n.transform('name'),       width: '200px' },
  { key: '_data_source.name', label: this.i18n.transform('datasource'), width: '200px' }, // dot-path
  { key: 'columns',           label: this.i18n.transform('columns') },
  { key: 'filters',           label: this.i18n.transform('filters') },
  { key: 'actions',           label: this.i18n.transform('actions'),    width: '150px', align: 'center', ellipsis: false }
];
```

`ColumnConfig`:
```ts
{
  key: string;       // column id; also dot-path resolver against the row
  label: string;     // header text — already translated; component runs no pipes
  width?: string;    // e.g. '200px' — strongly recommended (table-layout is fixed)
  align?: 'left' | 'center' | 'right';
  ellipsis?: boolean; // default true. Set false on icon/action/checkbox cells.
}
```

**Translation:** every feature has its own `translate` pipe. Translate before building the config — do not pass raw keys.

**Dot paths:** `key: '_data_source.name'` reads `row._data_source.name`. Useful for populated relations.

---

## 3. Wire the template

```html
<app-data-table
  [rows]="rows"
  [columns]="columns"
  [totalCount]="count"
  [pageSize]="pageSize"
  [pageIndex]="page - 1"
  (pageChange)="onPageChange($event)"
  (rowClick)="onSelect($event._id)">
</app-data-table>
```

That's it for a plain-text listing. Default cell renders `row[key]` with ellipsis + native title tooltip.

### Inputs

| Input | Type | Default | Notes |
|---|---|---|---|
| `rows` | `any[]` | `[]` | Current page slice from server |
| `columns` | `ColumnConfig[]` | required | Order matters — that's render order |
| `totalCount` | `number` | `0` | Total across all pages — drives paginator |
| `pageSize` | `number` | `10` | |
| `pageSizeOptions` | `number[]` | `[5, 10, 25, 50]` | |
| `pageIndex` | `number` | `0` | Zero-based. Pass `page - 1` if you store 1-based. |

### Outputs

| Output | Payload | Notes |
|---|---|---|
| `pageChange` | `PageEvent { pageIndex, pageSize, length }` | Fires for both page nav and size change |
| `rowClick` | the row object | Fires on any cell click; stop propagation in custom cells if needed |

---

## 4. Wire the data flow (server-side)

The table is presentational. Parent component owns: fetching, pagination state, sort state, filter state.

```ts
page = 1;
pageSize = 10;
rows: any[] = [];
count = 0;

ngOnInit() { this.fetch(); }

fetch() {
  this.service.list(this.page - 1, this.pageSize, /* sort, filter */).then(r => {
    this.rows = r.payload.items;
    this.count = r.payload.count;
    this.cdr.markForCheck();   // OnPush
  });
}

onPageChange(e: PageEvent) {
  this.page = e.pageIndex + 1;
  this.pageSize = e.pageSize;
  this.fetch();
}
```

Never mutate `rows` to filter/sort client-side — re-fetch.

---

## 5. Custom cells — `*cellDef`

Project a template keyed by column. The default text render is replaced; the `<td>` still gets ellipsis (unless `ellipsis: false`).

```html
<app-data-table [rows]="rows" [columns]="columns" ...>

  <ng-template [cellDef]="'lastLogin'" let-row>
    {{ row.lastLogin | timeAgo }}
  </ng-template>

  <ng-template [cellDef]="'active'" let-row>
    @if (row.active) {
      <app-icon [icon]="'check_circle'" class="status-icon active"></app-icon>
    } @else {
      <app-icon [icon]="'block'" class="status-icon inactive"></app-icon>
    }
  </ng-template>

  <ng-template [cellDef]="'actions'" let-row>
    <div class="actions-cell" (click)="$event.stopPropagation()">
      <button app-button appearance="icon"
              (click)="delete(row)"
              [hasPermissions]="'users:role#delete'"
              [appTooltip]="'delete' | translate">
        <app-icon [icon]="'delete'"></app-icon>
      </button>
    </div>
  </ng-template>

</app-data-table>
```

**Rules:**
- `let-row` exposes the full row object.
- Wrap action buttons in a div with `(click)="$event.stopPropagation()"` if you don't want `rowClick` firing when buttons are pressed.
- Apply `ellipsis: false` on the column for action/icon/multi-element cells. With `ellipsis: true` (default), the `<td>` truncates with `max-width: 0` — fine for inline text/spans, breaks `inline-flex` action rows.
- Permissions: use existing directives directly inside the template (`hasPermissions`, `hasPermissionsHide`, `NoPermissionDisable`). The component doesn't know about them.

---

## 6. Custom headers — `*headerDef`

Same idea, for the header cell. Use this for in-header filter inputs.

```html
<ng-template [headerDef]="'firstname'">
  <div class="header-wrap">
    <input class="filter-input"
           type="text"
           [placeholder]="'firstname' | translate"
           debounceKeyUp
           [debounceTime]="500"
           (onEvent)="onFilter('firstname', $event.target['value'])"
           (click)="$event.stopPropagation()">
  </div>
</ng-template>
```

When a `headerDef` is present for a column, it replaces the default label.

---

## 7. Patterns

### Filter bar above the table
Use `FilterBarComponent` (`core/shared/components/filter-bar`). It's a separate dropdown-filter strip; the table doesn't know about it.

```html
<filter-bar [filters]="filterConfigs"
            (filterChanged)="onFilterChanged($event)"
            (filterSearched)="onFilterSearched($event)">
</filter-bar>

<app-data-table [rows]="rows" [columns]="columns" ...></app-data-table>
```

### Action button column
Drive via `*cellDef` template, not config. Permissions, conditional buttons, dropdown menus (`cdkMenuTriggerFor`) all live in the template:

```html
<ng-template [cellDef]="'actions'" let-row>
  <div class="actions-cell" (click)="$event.stopPropagation()">
    <button app-button [cdkMenuTriggerFor]="exportMenu">Export</button>
    <ng-template #exportMenu>
      <div cdkMenu class="menu-panel">
        @for (s of row._strategies; track s.key) {
          <button cdkMenuItem (click)="run(row, s.key)">{{ s.name }}</button>
        }
      </div>
    </ng-template>

    <button app-button appearance="icon" (click)="delete(row)">
      <app-icon [icon]="'delete'"></app-icon>
    </button>
  </div>
</ng-template>
```

### Status icon column
```ts
{ key: 'active', label: 'Active', width: '80px', align: 'center', ellipsis: false }
```
```html
<ng-template [cellDef]="'active'" let-row>
  @if (row.active) { <app-icon [icon]="'check_circle'" class="status-icon active"></app-icon> }
  @else            { <app-icon [icon]="'block'" class="status-icon inactive"></app-icon> }
</ng-template>
```

### Pipe-formatted text
Just use a `cellDef`:
```html
<ng-template [cellDef]="'lastLogin'" let-row>{{ row.lastLogin | timeAgo }}</ng-template>
```

### Tooltip on long values
```html
<ng-template [cellDef]="'groups'" let-row>
  <span [appTooltip]="getGroupsTooltip(row.groups)" class="has-popover">
    {{ getGroups(row.groups) }}
  </span>
</ng-template>
```

---

## 8. Styling notes

- `table-layout: fixed` — set `width` on every meaningful column. Remaining columns share leftover space.
- Ellipsis works because the `<td>` has `max-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis`. Inline text/spans truncate cleanly. `inline-flex`/`flex` content does not — opt out with `ellipsis: false`.
- Sticky header is on by default.
- Below 768px the wrapper switches to horizontal scroll (`min-width: 600px` on the table).
- CSS variables consumed: `--color-divider`, `--color-surface`, `--color-tertiary`, `--color-secondary`, `--color-row-hover`. Override globally if you need a different palette.

---

## 9. Real examples in the codebase

- `core/modules/exports/export-template-listing/` — text columns + dot-path + `*cellDef` for inline `cdk-menu` export dropdown + delete button.
- `core/modules/users/listing/` — bigger one. `*headerDef` for inline filter inputs (firstname/lastname/email), `*cellDef` for status icon, roles count, groups tooltip, lastLogin pipe, conditional 2FA login button, permission-aware delete.

Read these before adding a new listing.

---

## 10. Checklist for a new listing

1. [ ] Build column config in the constructor / `ngOnInit` (translate labels there).
2. [ ] Set `width` on every column you care about; `ellipsis: false` on icon/action/multi-element cells.
3. [ ] Implement `fetch()`, `onPageChange()`. Call `cdr.markForCheck()` after assigning rows (OnPush).
4. [ ] Add `*cellDef` for every non-text column.
5. [ ] Add `*headerDef` if you want in-header filter inputs (otherwise put filters in a `<filter-bar>` above).
6. [ ] Wrap inner action button rows in a div with `(click)="$event.stopPropagation()"` so `rowClick` doesn't fire.
7. [ ] Wire `(rowClick)` to navigate to detail (or omit if rows aren't clickable).
