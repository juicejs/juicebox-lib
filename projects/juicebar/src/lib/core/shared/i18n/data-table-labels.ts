import { inject } from '@angular/core';
import { DataTableLabels } from '../../../ui-components/data-table/data-table.labels';
import { JuiceboxService } from '../services/Juicebox.service';
import { SharedTranslationPipe } from './shared-translation.pipe';

/**
 * The data table's texts from the shared dictionary, for DATA_TABLE_LABELS. Each is read when a table asks for it, in
 * the language of the user who is signed in then.
 */
export function translatedDataTableLabels(): DataTableLabels {
  const juicebox = inject(JuiceboxService);
  const text = (key: string): string => new SharedTranslationPipe(juicebox).transform(key);
  return {
    get rowsPerPage() { return text('rows_per_page'); },
    get of() { return text('range_of'); },
    get previousPage() { return text('previous_page'); },
    get nextPage() { return text('next_page'); },
    get noData() { return text('no_data_to_display'); },
    get sort() { return text('sort'); },
    get selectRow() { return text('select_row'); },
    get clearSelection() { return text('clear_selection'); },
    get resizeColumn() { return text('resize_column'); },
  };
}
