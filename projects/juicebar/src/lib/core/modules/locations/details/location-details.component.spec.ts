import {Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {LOCATIONS_CUSTOMIZATION, LocationsCustomization} from '../../../../config/base-app.config';
import {provideJuicebarTesting} from '../../../../../testing/juicebar-testing';
import {LocationsService} from '../locations.service';
import {StoredLocation} from '../locations.types';
import {LocationDetailsComponent} from './location-details.component';

@Component({template: ''})
class TabStubComponent {}

describe('LocationDetailsComponent', () => {
  async function tabsOf(location: StoredLocation, customization: LocationsCustomization = {}): Promise<string[]> {
    TestBed.configureTestingModule({
      providers: [
        ...provideJuicebarTesting(),
        provideRouter([{
          path: 'main/location/details/:id',
          component: LocationDetailsComponent,
          children: [{path: '**', component: TabStubComponent}],
        }]),
        {provide: LOCATIONS_CUSTOMIZATION, useValue: customization},
      ],
    });
    vi.spyOn(TestBed.inject(LocationsService), 'get').mockResolvedValue({success: true, payload: location});
    const {RouterTestingHarness} = await import('@angular/router/testing');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/main/location/details/${location._id}/details-location`);
    // The location loads after the navigation
    await new Promise(resolve => setTimeout(resolve));
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toContain(location._id);
    return Array.from((harness.routeNativeElement as HTMLElement).querySelectorAll('[role="tab"]'))
      .map(tab => tab.textContent!.trim());
  }

  it('shows the attributes and documents tabs, as QC restored them', async () => {
    expect(await tabsOf({_id: 'l1', type: 'geo'})).toEqual(['Details', 'Attributes', 'Media', 'Documents']);
  });

  it('a project can hide them; a venue has its seating layout', async () => {
    expect(await tabsOf({_id: 'l2', type: 'venue'}, {options: {hiddenTabs: ['attributes', 'documents']}}))
      .toEqual(['Details', 'Media', 'Seating layout']);
  });
});
