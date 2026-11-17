import {TestBed} from '@angular/core/testing';
import {provideJuicebarTesting, signInTestUser} from '../../../../testing/juicebar-testing';
import {JuiceboxService} from './Juicebox.service';

describe('JuiceboxService: the admin\'s search (doSearch)', () => {
  function setup() {
    TestBed.configureTestingModule({providers: provideJuicebarTesting()});
    signInTestUser();
    const juicebox = TestBed.inject(JuiceboxService);
    vi.spyOn(juicebox, 'hasRole').mockImplementation(role => role !== 'secret:role');
    return juicebox;
  }
  const result = (title: string) => ({title, details: '', link: `main/${title}`});

  it('gives each provider\'s results under its name and icon, for the roles the user has', async () => {
    const juicebox = setup();
    juicebox.registerSearchProvider({search: async () => [result('ada')]}, 'Users', 'fa-users', 'users:role');
    juicebox.registerSearchProvider({search: async () => [result('hidden')]}, 'Secrets', 'fa-lock', 'secret:role');
    expect(await juicebox.doSearch('a')).toEqual([{name: 'Users', icon: 'fa-users', results: [result('ada')]}]);
  });

  it('a provider that fails has no results and the others still show, as in the old juicebox', async () => {
    const juicebox = setup();
    juicebox.registerSearchProvider({search: () => Promise.reject(new Error('500'))}, 'Users', 'fa-users', 'users:role');
    juicebox.registerSearchProvider({search: () => { throw new Error('broken'); }}, 'Exports', 'fa-table', 'exports:role');
    juicebox.registerSearchProvider({search: async () => [result('acme')]}, 'Entities', 'fa-address-book', 'entities:role');
    expect(await juicebox.doSearch('a')).toEqual([{name: 'Entities', icon: 'fa-address-book', results: [result('acme')]}]);
  });

  it('a provider that answers nothing has an empty list', async () => {
    const juicebox = setup();
    juicebox.registerSearchProvider({search: async () => undefined as never}, 'Users', 'fa-users', 'users:role');
    expect(await juicebox.doSearch('a')).toEqual([{name: 'Users', icon: 'fa-users', results: []}]);
  });
});
