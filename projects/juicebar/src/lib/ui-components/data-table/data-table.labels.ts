import { InjectionToken } from '@angular/core';

/**
 * The texts of the data table and its paginator. Provided once (the lib translates them from its shared dictionary),
 * they are every table's; a table's own label input still wins. A project that wants other words provides the token.
 */
export interface DataTableLabels {
  /** The paginator's page size control */
  rowsPerPage: string;
  /** Between the range and the total: "1–10 of 185" */
  of: string;
  previousPage: string;
  nextPage: string;
  /** Shown when there are no rows */
  noData: string;
  /** Phone list: the control that sorts the rows */
  sort: string;
  /** A row's checkbox (`selectable`) */
  selectRow: string;
  clearSelection: string;
  /** A column's resize handle, followed by the column's label */
  resizeColumn: string;
}

export const DEFAULT_DATA_TABLE_LABELS: DataTableLabels = {
  rowsPerPage: 'Rows per page',
  of: 'of',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  noData: 'No data to display',
  sort: 'Sort',
  selectRow: 'Select row',
  clearSelection: 'Clear selection',
  resizeColumn: 'Resize column',
};

export const DATA_TABLE_LABELS = new InjectionToken<DataTableLabels>('DATA_TABLE_LABELS', {
  providedIn: 'root',
  factory: () => DEFAULT_DATA_TABLE_LABELS,
});
