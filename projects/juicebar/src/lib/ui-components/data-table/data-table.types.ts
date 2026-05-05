export interface ColumnConfig {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  ellipsis?: boolean;
  sortable?: boolean;
}

export type SortDir = 'asc' | 'desc' | '';

export interface SortState {
  prop: string;
  dir: string;
}
