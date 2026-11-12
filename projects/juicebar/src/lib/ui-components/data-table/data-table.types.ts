export interface ColumnConfig {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  ellipsis?: boolean;
  sortable?: boolean;
  /** Drag the header's right edge to change the width (default true) */
  resizable?: boolean;
  /** The `compactRowDef` template already shows this column, so the phone list doesn't repeat it under the row's name */
  inCompactRow?: boolean;
  /**
   * What the column is in the phone list, where the table can't tell by itself: the row's `name` (otherwise the first
   * column) or its `actions` (otherwise the column with the key `actions`)
   */
  listRole?: 'name' | 'actions';
}

export type SortDir = 'asc' | 'desc' | '';

export interface SortState {
  prop: string;
  dir: string;
}
