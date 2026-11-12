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
    expect(labels.rowsPerPage).toBe('Zeilen pro Seite');
    expect(labels.of).toBe('von');

    juicebox.setLanguage('hr_HR');
    expect(labels.rowsPerPage).toBe('Redaka po stranici');
    expect(labels.noData).toBe('Nema podataka za prikaz');
    expect(labels.sort).toBe('Sortiraj');
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
