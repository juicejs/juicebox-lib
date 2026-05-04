import { makeEnvironmentProviders } from '@angular/core';
import { ExportsTranslationPipe } from './i18n/exports.translation';
import { ModuleCustomization, EXPORTS_CUSTOMIZATION, JuicebarFeature } from '../../../config/base-app.config';
import { ExportsRoute } from './exports.route';

export function provideExports(customization?: ModuleCustomization): JuicebarFeature {
  return {
    routes: ExportsRoute,
    providers: makeEnvironmentProviders([
      ExportsTranslationPipe,
      {
        provide: EXPORTS_CUSTOMIZATION,
        useValue: customization ?? {},
      },
    ]),
  };
}
