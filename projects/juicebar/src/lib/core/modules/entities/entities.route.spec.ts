import {TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {provideRouter, Router} from '@angular/router';
import {RouterTestingHarness} from '@angular/router/testing';
import {of} from 'rxjs';
import {ENTITIES_CUSTOMIZATION} from '../../../config/base-app.config';
import {provideJuicebarTesting, settle, signInTestUser} from '../../../../testing/juicebar-testing';
import {DialogService} from '../../../ui-components';
import {ConfigurationService} from '../../shared/services/configuration.service';
import {DetailsEntityComponent} from './details/details-entity/details-entity.component';
import {buildEntitiesRoute} from './entities.route';
import {EntitiesService} from './entities.service';
import {EntitiesTranslationPipe} from './i18n/entities.translation';

describe('the customers routes', () => {
  async function open(url: string) {
    TestBed.configureTestingModule({
      providers: [
        ...provideJuicebarTesting(),
        provideRouter(buildEntitiesRoute()),
        EntitiesTranslationPipe,
        {provide: ENTITIES_CUSTOMIZATION, useValue: {}},
      ],
    });
    signInTestUser();
    const entities = TestBed.inject(EntitiesService);
    vi.spyOn(entities, 'get').mockImplementation(async id => ({success: true, payload: {_id: id, firstname: 'Ada', lastname: id, addresses: []}}));
    vi.spyOn(entities, 'fetchEntityGroups').mockResolvedValue({success: true, payload: {count: 0, items: []}});
    vi.spyOn(TestBed.inject(ConfigurationService), 'getByKey').mockResolvedValue({success: false});
    // The question about unsaved changes, answered "no"
    const ask = vi.spyOn(TestBed.inject(DialogService), 'open').mockReturnValue({closed: of(false)} as never);
    const harness = await RouterTestingHarness.create(url);
    await settle(harness.fixture, 6);
    const detailsTab = () => harness.fixture.debugElement.query(By.directive(DetailsEntityComponent)).componentInstance as DetailsEntityComponent;
    return {harness, ask, router: TestBed.inject(Router), detailsTab};
  }

  it('asks about unsaved changes when another customer is opened beside the Details tab', async () => {
    const {harness, ask, router, detailsTab} = await open('/entities/details/a/details-entity');
    detailsTab()['entityForm'].markAsDirty();
    await harness.navigateByUrl('/entities/details/b/details-entity').catch(() => undefined);
    expect(ask).toHaveBeenCalledTimes(1);
    // Answered "no": the first customer stays open
    expect(router.url).toBe('/entities/details/a/details-entity');
  });

  it('opens another customer without a question when nothing was changed', async () => {
    const {harness, ask, router} = await open('/entities/details/a/details-entity');
    await harness.navigateByUrl('/entities/details/b/details-entity');
    expect(ask).not.toHaveBeenCalled();
    expect(router.url).toBe('/entities/details/b/details-entity');
  });

  it('keeps the old juicebox\'s pages that no tab leads to', () => {
    const tabs = buildEntitiesRoute()[0].children!.find(route => route.path === 'details/:id')!.children!.map(route => route.path);
    expect(tabs).toEqual(expect.arrayContaining(['documents-entity', 'addlogo-entity', 'prices-entity']));
  });
});
