import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {provideRouter, Router} from '@angular/router';
import {RouterTestingHarness} from '@angular/router/testing';
import {of} from 'rxjs';
import {LOCATIONS_CUSTOMIZATION} from '../../../config/base-app.config';
import {provideJuicebarTesting, settle, signInTestUser} from '../../../../testing/juicebar-testing';
import {DialogService} from '../../../ui-components';
import {ConfigurationService} from '../../shared/services/configuration.service';
import {DetailsLocationComponent} from './details/details-location/details-location.component';
import {LocationsTranslationPipe} from './i18n/locations.translation';
import {buildLocationsRoute} from './locations.route';
import {LocationsService} from './locations.service';

describe('the locations routes', () => {
  async function open(url: string) {
    TestBed.configureTestingModule({
      providers: [
        ...provideJuicebarTesting(),
        provideRouter(buildLocationsRoute()),
        LocationsTranslationPipe,
        {provide: LOCATIONS_CUSTOMIZATION, useValue: {}},
      ],
    });
    signInTestUser();
    const locations = TestBed.inject(LocationsService);
    vi.spyOn(locations, 'get').mockImplementation(async id =>
      ({success: true, payload: {_id: id, type: 'geo', name: {en_GB: `Place ${id}`}, address: [{}]}}));
    vi.spyOn(locations, 'fetchCountries').mockResolvedValue({success: true, payload: []});
    vi.spyOn(TestBed.inject(ConfigurationService), 'getBySchema').mockResolvedValue({success: true, payload: [{value: 'geo'}]});
    // The question about unsaved changes, answered "no"
    const ask = vi.spyOn(TestBed.inject(DialogService), 'open').mockReturnValue({closed: of(false)} as never);
    const harness = await RouterTestingHarness.create(url);
    await settle(harness.fixture, 6);
    const detailsTab = () => harness.fixture.debugElement.query(By.directive(DetailsLocationComponent)).componentInstance as DetailsLocationComponent;
    return {harness, ask, router: TestBed.inject(Router), detailsTab};
  }

  it('asks about unsaved changes when another location is opened beside the Details tab', async () => {
    const {harness, ask, router, detailsTab} = await open('/location/details/a/details-location');
    detailsTab()['form'].markAsDirty();
    await harness.navigateByUrl('/location/details/b/details-location').catch(() => undefined);
    expect(ask).toHaveBeenCalledTimes(1);
    // Answered "no": the first location stays open
    expect(router.url).toBe('/location/details/a/details-location');
  });

  it('opens another location without a question when nothing was changed', async () => {
    const {harness, ask, router} = await open('/location/details/a/details-location');
    await harness.navigateByUrl('/location/details/b/details-location');
    expect(ask).not.toHaveBeenCalled();
    expect(router.url).toBe('/location/details/b/details-location');
  });
});
