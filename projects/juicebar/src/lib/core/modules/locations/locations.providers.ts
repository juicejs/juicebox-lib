import {makeEnvironmentProviders} from '@angular/core';
import {JuicebarFeature, LOCATIONS_CUSTOMIZATION, LocationsCustomization} from '../../../config/base-app.config';
import {LocationsTranslationPipe} from './i18n/locations.translation';
import {buildLocationsRoute} from './locations.route';

/**
 * The locations module (the old juicebox `location`), with a sidebar entry for `locations:role`. Quality Circle's
 * extras are options, e.g. `provideLocations({options: {fields: ['email', 'accessibility', 'coordinates'],
 * shortNameMaxLength: 19, ownerFilter: true, archivableTypes: ['web', 'geo'], deletableTypes: ['region', 'web', 'geo']}})`.
 */
export function provideLocations(customization?: LocationsCustomization): JuicebarFeature {
  return {
    routes: buildLocationsRoute(customization?.componentOverrides),
    providers: makeEnvironmentProviders([
      LocationsTranslationPipe,
      ...(customization?.providers ?? []),
      {provide: LOCATIONS_CUSTOMIZATION, useValue: customization ?? {}},
    ]),
  };
}
