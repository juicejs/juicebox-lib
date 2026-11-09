import {TestBed} from '@angular/core/testing';
import {Location} from '@angular/common';
import {provideRouter, Router} from '@angular/router';
import {LOCATIONS_CUSTOMIZATION, LocationsCustomization} from '../../../../config/base-app.config';
import {provideJuicebarTesting, signInTestUser} from '../../../../../testing/juicebar-testing';
import {ConfigurationService} from '../../../shared/services/configuration.service';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {LocationsTranslationPipe} from '../i18n/locations.translation';
import {LocationsService} from '../locations.service';
import {StoredLocation} from '../locations.types';
import {LocationListingComponent} from './location-listing.component';

const hall: StoredLocation = {
  _id: 'hall', name: {en_GB: 'Hall'}, type: 'geo', organisation_id: 'org-1',
  address: [{city: 'Berlin', country: {_id: 'de', code: 'DE', name: {en_GB: 'Germany'}}}],
};
const site: StoredLocation = {_id: 'site', name: {en_GB: 'Site'}, type: 'web', organisation_id: 'org-2', address: [{}]};
const region: StoredLocation = {_id: 'region', name: {en_GB: 'North'}, type: 'region', address: [{}]};

describe('LocationListingComponent', () => {
  async function setup(customization: LocationsCustomization = {}) {
    TestBed.configureTestingModule({
      imports: [LocationListingComponent],
      providers: [
        ...provideJuicebarTesting(),
        provideRouter([{path: '**', children: []}]),
        LocationsTranslationPipe,
        {provide: LOCATIONS_CUSTOMIZATION, useValue: customization},
      ],
    });
    signInTestUser();
    vi.spyOn(TestBed.inject(ConfigurationService), 'getBySchema').mockResolvedValue({
      success: true,
      payload: [{value: 'geo', localised_name: {en_GB: 'Geo'}}, {value: 'web'}, {value: 'region'}, {value: 'secret', permissions: ['secret']}],
    });
    vi.spyOn(TestBed.inject(JuiceboxService), 'getLoggedInOrganisation').mockResolvedValue({_id: 'org-1'});
    const locations = TestBed.inject(LocationsService);
    const fetch = vi.spyOn(locations, 'fetch').mockResolvedValue({success: true, payload: {locations: [hall, site, region], count: 3}});
    const put = vi.spyOn(locations, 'put').mockResolvedValue({success: true, payload: {location: site}});
    await TestBed.inject(Router).navigateByUrl('/main/location?page=2');
    const fixture = TestBed.createComponent(LocationListingComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const rowButton = (row: number, label: string) =>
      element.querySelectorAll('tbody tr')[row]?.querySelector<HTMLButtonElement>(`[aria-label^="${label}"]`) ?? null;
    return {fixture, element, fetch, put, rowButton};
  }

  it('fetches the page from the URL with the types the user may see, as the old listing', async () => {
    const {fetch, element} = await setup();
    expect(fetch).toHaveBeenCalledWith(1, 10, {
      filters: {archived: false, typed: [], types: ['geo', 'web', 'region']},
      language: 'en_GB',
      populateCountry: true,
    });
    const first = element.querySelector('tbody tr')!.textContent!;
    expect(first).toContain('Hall');
    expect(first).toContain('Geo');
    expect(first).toContain('Germany');
  });

  it('filters the name in the user\'s language after typing pauses, from the first page', async () => {
    const {fetch, element, fixture} = await setup();
    const input = element.querySelector<HTMLInputElement>('input[aria-label="Name"]')!;
    input.value = 'Hal';
    input.dispatchEvent(new Event('input'));
    expect(fetch).toHaveBeenCalledTimes(1);
    await new Promise(resolve => setTimeout(resolve, 350));
    await fixture.whenStable();
    expect(fetch).toHaveBeenLastCalledWith(0, 10, expect.objectContaining({
      filters: expect.objectContaining({typed: [{key: 'name.en_GB', value: 'Hal'}]}),
    }));
    // The address shows the first page again; a navigation would take the page's action buttons away
    expect(TestBed.inject(Location).path()).toBe('/main/location');
  });

  it('deletes only regions by default and archives nothing', async () => {
    const {rowButton} = await setup();
    expect(rowButton(2, 'Delete')).not.toBeNull();
    expect(rowButton(1, 'Delete')).toBeNull();
    expect(rowButton(1, 'Archive')).toBeNull();
  });

  it('with the QC options: archives web and geo locations, sending the location back', async () => {
    const {rowButton, put, fixture} = await setup({options: {archivableTypes: ['web', 'geo'], deletableTypes: ['region', 'web', 'geo']}});
    expect(rowButton(1, 'Delete')).not.toBeNull();
    rowButton(1, 'Archive')!.click();
    await fixture.whenStable();
    expect(put).toHaveBeenCalledWith('site', expect.objectContaining({name: 'Site', type: 'web', archived: true}));
  });

  it('shows the user\'s organisation\'s locations, or the others\', with the owner filter', async () => {
    const {element, fixture} = await setup({options: {ownerFilter: true}});
    const component = fixture.componentInstance as unknown as {owner: {set(value: string): void}};
    component.owner.set('mine');
    await fixture.whenStable();
    expect(Array.from(element.querySelectorAll('tbody tr')).map(row => row.querySelector('a')?.textContent?.trim()))
      .toEqual(['Hall']);
    component.owner.set('public');
    await fixture.whenStable();
    expect(element.querySelectorAll('tbody tr').length).toBe(2);
  });
});
