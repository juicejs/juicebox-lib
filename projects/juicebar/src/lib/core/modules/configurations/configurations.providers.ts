import {makeEnvironmentProviders} from '@angular/core';
import {CONFIGURATIONS_CUSTOMIZATION, ConfigurationsCustomization, JuicebarFeature} from '../../../config/base-app.config';
import {ConfigurationsTranslationPipe} from './i18n/configurations.translation';
import {buildConfigurationsRoute} from './configurations.route';

/**
 * The configurations module (the old juicebox `configuration`): the backend's configurations in memory and in the
 * database, compared, added, changed and deleted. Its sidebar entry is for `configuration:role`.
 */
export function provideConfigurations(customization?: ConfigurationsCustomization): JuicebarFeature {
  return {
    routes: buildConfigurationsRoute(customization?.componentOverrides),
    providers: makeEnvironmentProviders([
      ConfigurationsTranslationPipe,
      ...(customization?.providers ?? []),
      {provide: CONFIGURATIONS_CUSTOMIZATION, useValue: customization ?? {}},
    ]),
  };
}
