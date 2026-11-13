import { TestBed } from '@angular/core/testing';
import { provideJuicebarTesting, signInTestUser } from '../../../../testing/juicebar-testing';
import { JuiceboxService } from '../services/Juicebox.service';
import { translatedDataTableLabels } from './data-table-labels';

describe('translatedDataTableLabels', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideJuicebarTesting() });
    signInTestUser();
  });

  it('gives the table its texts in the language of the user who is signed in when they are read', () => {
    const juicebox = TestBed.inject(JuiceboxService);
    const labels = TestBed.runInInjectionContext(() => translatedDataTableLabels());

    juicebox.setLanguage('de_DE');
    expect(labels.of).toBe('von');
    expect(labels.sort).toBe('Sortieren');

    juicebox.setLanguage('sv_SE');
    expect(labels.noData).toBe('Ingen data att visa');
    // Only texts copied from the old juicebox: a word it has none for in the language shows its key
    expect(labels.rowsPerPage).toBe('@rows_per_page');
  });

  it('has every text in English', () => {
    TestBed.inject(JuiceboxService).setLanguage('en_GB');
    const labels = TestBed.runInInjectionContext(() => translatedDataTableLabels());

    expect({ ...labels }).toEqual({
      rowsPerPage: 'Rows per page',
      of: 'of',
      previousPage: 'Previous page',
      nextPage: 'Next page',
      noData: 'No data to display',
      sort: 'Sort',
      selectRow: 'Select row',
      clearSelection: 'Clear selection',
      resizeColumn: 'Resize column',
    });
  });
});
