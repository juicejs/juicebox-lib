import {Provider, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {ENTITIES_CUSTOMIZATION} from '../../../../config/base-app.config';
import {provideJuicebarTesting, settle, signInTestUser} from '../../../../../testing/juicebar-testing';
import {LISTING_PANE, ListingStateService} from '../../../shared/components/listing-pane/listing-pane';
import {ConfigurationService} from '../../../shared/services/configuration.service';
import {EntitiesService} from '../entities.service';
import {Entity} from '../entities.types';
import {EntitiesTranslationPipe} from '../i18n/entities.translation';
import {EntitiesListingComponent} from './entities-listing.component';

const SETTINGS = {
  types: [
    {name: 'private', prop: 'private', columns: [
      {name: 'firstname', prop: 'firstname'}, {name: 'lastname', prop: 'lastname'}, {name: 'email', prop: 'email'}, {name: 'group', prop: 'groupNames'},
    ]},
    {name: 'commercial', prop: 'commercial', columns: [{name: 'company_name', prop: 'name'}]},
    {name: 'public', prop: 'public', columns: [{name: 'lastname', prop: 'lastname'}, {name: 'email', prop: 'email-hidden'}]},
  ],
};
/** What the listing showed last, as it keeps it for the compact list */
const shown = (type: string) =>
  ({page: 1, pageSize: 10, sort: {prop: 'lastname', dir: 'asc'}, type, organisation: null, attribute: null, value: null, typed: {}});
const PANE: Provider = {provide: LISTING_PANE, useValue: {activeId: signal('ada')}};
const ada: Entity = {_id: 'ada', type: 'private', firstname: 'Ada', lastname: 'Lovelace', email: 'ada@example.com', groups: ['vip'], protected: 'user-1'};
const bob: Entity = {_id: 'bob', type: 'private', firstname: 'Bob', lastname: 'Stone', email: 'bob@example.com', noDelete: true};

describe('EntitiesListingComponent', () => {
  async function setup(listingState?: unknown, providers: Provider[] = []) {
    TestBed.configureTestingModule({
      imports: [EntitiesListingComponent],
      providers: [
        ...provideJuicebarTesting(),
        provideRouter([{path: '**', children: []}]),
        EntitiesTranslationPipe,
        {provide: ENTITIES_CUSTOMIZATION, useValue: {}},
        ...providers,
      ],
    });
    signInTestUser();
    if (listingState) TestBed.inject(ListingStateService).save('entities', listingState);
    const configuration = TestBed.inject(ConfigurationService);
    const getByKey = vi.spyOn(configuration, 'getByKey').mockImplementation(async (key: string) =>
      key === 'entities:juicebox:settings' ? {success: true, payload: {options: SETTINGS}} : {success: false});
    const getBySchema = vi.spyOn(configuration, 'getBySchema').mockResolvedValue({
      success: true,
      payload: [{key: 'segment:entity:private', property: 'segment', name: 'Segment', model: 'entity:private', datatype: 'text'}],
    });
    const entities = TestBed.inject(EntitiesService);
    const fetch = vi.spyOn(entities, 'fetch').mockResolvedValue({success: true, payload: {items: [ada, bob], count: 2}});
    const groupById = vi.spyOn(entities, 'getGroupById').mockResolvedValue({success: true, payload: {_id: 'vip', name: 'VIP'}});
    await TestBed.inject(Router).navigateByUrl('/main/entities');
    const fixture = TestBed.createComponent(EntitiesListingComponent);
    fixture.autoDetectChanges();
    await settle(fixture);
    return {fixture, element: fixture.nativeElement as HTMLElement, fetch, groupById, getByKey, getBySchema};
  }

  it('lists the first type\'s customers by last name, in that type\'s columns, as the old listing asked for them', async () => {
    const {fetch, element, groupById} = await setup();
    expect(fetch).toHaveBeenCalledWith(0, 10, {
      type: 'private',
      organisation: undefined,
      sort: {prop: 'lastname', dir: 'asc'},
      filter: [],
      attribute: null,
    });
    const first = element.querySelector('tbody tr')!;
    expect(first.textContent).toContain('Ada');
    expect(first.textContent).toContain('ada@example.com');
    // The names of the customer's groups, each read once
    expect(groupById).toHaveBeenCalledTimes(1);
    expect(first.textContent).toContain('VIP');
  });

  it('gives every customer a delete button, except one the backend marked noDelete', async () => {
    const {element} = await setup();
    const rows = element.querySelectorAll('tbody tr');
    expect(rows[0].querySelector('[aria-label^="Delete"]')).not.toBeNull();
    expect(rows[1].querySelector('[aria-label^="Delete"]')).toBeNull();
  });

  it('filters a column half a second after typing pauses, from the first page, with the old listing\'s term', async () => {
    const {fetch, element, fixture} = await setup({
      page: 2, pageSize: 10, sort: {prop: 'lastname', dir: 'asc'}, type: 'private', organisation: null, attribute: null, value: null, typed: {},
    });
    expect(fetch).toHaveBeenLastCalledWith(1, 10, expect.anything());
    const input = element.querySelector<HTMLInputElement>('input[aria-label="Lastname"]')!;
    input.value = 'love';
    input.dispatchEvent(new Event('input'));
    await new Promise(resolve => setTimeout(resolve, 300));
    expect(fetch).toHaveBeenCalledTimes(1);
    await new Promise(resolve => setTimeout(resolve, 300));
    await settle(fixture);
    expect(fetch).toHaveBeenLastCalledWith(0, 10, expect.objectContaining({
      filter: [{property: 'lastname', term: 'love', fullText: true, language: false, languages: null}],
    }));
  });

  it('the group names are filtered as `group`, and the e-mail address has a filter too', async () => {
    const {element} = await setup();
    expect(element.querySelector('input[aria-label="Group"]')).not.toBeNull();
    expect(element.querySelector('input[aria-label="Email"]')).not.toBeNull();
  });

  it('offers the type\'s attribute fields as a filter, and no organisation filter to staff who are not super admins', async () => {
    const {element} = await setup();
    expect(element.textContent).toContain('Filter by attribute');
    expect(element.textContent).not.toContain('Organisation');
  });

  it('comes back from a customer with the type, the page and the filters it had', async () => {
    const {fetch, element} = await setup({
      page: 1, pageSize: 20, sort: {prop: 'name', dir: 'desc'}, type: 'commercial', organisation: null, attribute: null, value: null,
      typed: {name: 'acme'},
    });
    expect(fetch).toHaveBeenCalledWith(0, 20, expect.objectContaining({
      type: 'commercial',
      sort: {prop: 'name', dir: 'desc'},
      filter: [expect.objectContaining({property: 'name', term: 'acme'})],
    }));
    expect(element.querySelector<HTMLInputElement>('input[aria-label="Company name"]')!.value).toBe('acme');
  });

  it('reads the attribute fields once, also when another type is chosen', async () => {
    // The select scrolls its highlighted option into view, which the test browser cannot
    Element.prototype.scrollIntoView = vi.fn();
    const {fixture, element, getBySchema, fetch} = await setup();
    expect(getBySchema).toHaveBeenCalledTimes(1);
    element.querySelector<HTMLButtonElement>('app-select button')!.click();
    await settle(fixture);
    const commercial = [...document.querySelectorAll<HTMLElement>('.app-select-panel [role=option]')].find(option => option.textContent!.includes('Commercial'))!;
    commercial.click();
    await settle(fixture);
    expect(fetch).toHaveBeenLastCalledWith(0, 10, expect.objectContaining({type: 'commercial'}));
    expect(getBySchema).toHaveBeenCalledTimes(1);
    // Commercial has no attribute fields
    expect(element.textContent).not.toContain('Filter by attribute');
  });

  describe('as the compact list next to an open customer', () => {
    it('shows the e-mail address under the name where the type has an e-mail column', async () => {
      const {element, getBySchema} = await setup(shown('private'), [PANE]);
      const subtitle = element.querySelector('.dt-list-subtitle')!;
      expect(element.querySelector('.dt-list-title')!.textContent).toBe('Ada Lovelace');
      expect(subtitle.textContent).toBe('ada@example.com');
      expect(subtitle.classList.contains('hidden-email')).toBe(false);
      // It has no filters: the attribute fields are not read for it
      expect(getBySchema).not.toHaveBeenCalled();
    });

    it('hides the e-mail address as the type\'s own column does', async () => {
      const {element} = await setup(shown('public'), [PANE]);
      expect(element.querySelector('.dt-list-subtitle')!.classList.contains('hidden-email')).toBe(true);
    });

    it('shows no e-mail address for a type without an e-mail column', async () => {
      const {element} = await setup(shown('commercial'), [PANE]);
      expect(element.querySelector('.dt-list-subtitle')).toBeNull();
      expect(element.textContent).not.toContain('ada@example.com');
    });
  });
});
