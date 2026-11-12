import { TestBed } from '@angular/core/testing';
import { provideJuicebarTesting, signInTestUser } from '../../../../testing/juicebar-testing';
import { JuiceboxService } from '../services/Juicebox.service';
import { SharedTranslationPipe } from './shared-translation.pipe';

describe('SharedTranslationPipe', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideJuicebarTesting() });
    signInTestUser();
  });

  /** The text a user with this language sees for a key of the shared dictionary */
  function text(language: string, key: string): string {
    const juicebox = TestBed.inject(JuiceboxService);
    juicebox.setLanguage(language);
    return new SharedTranslationPipe(juicebox).transform(key);
  }

  it('has the confirmation dialog\'s Cancel in the languages the users module has it in', () => {
    expect(text('en_GB', 'cancel')).toBe('Cancel');
    expect(text('de_DE', 'cancel')).toBe('Abbrechen');
    expect(text('hr_HR', 'cancel')).toBe('Odustani');
    expect(text('da_DK', 'cancel')).toBe('Afbryd');
    expect(text('sv_SE', 'cancel')).toBe('Avbryt');
    expect(text('fi_FI', 'cancel')).toBe('Peruuta');
  });
});
