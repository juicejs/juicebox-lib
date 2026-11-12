import {makeEnvironmentProviders} from '@angular/core';
import {COMMUNICATIONS_CUSTOMIZATION, CommunicationsCustomization, JuicebarFeature} from '../../../config/base-app.config';
import {buildCommunicationsRoute} from './communications.route';
import {CommunicationsTranslationPipe} from './i18n/communications.translation';

/**
 * The communications module (the old juicebox `communications`), with a sidebar entry for `communication:role`. Its
 * project parts are switched by the backend configuration (`communications:tabs`, `amgshop`, `communications`).
 */
export function provideCommunications(customization?: CommunicationsCustomization): JuicebarFeature {
  return {
    routes: buildCommunicationsRoute(customization?.componentOverrides),
    providers: makeEnvironmentProviders([
      CommunicationsTranslationPipe,
      ...(customization?.providers ?? []),
      {provide: COMMUNICATIONS_CUSTOMIZATION, useValue: customization ?? {}},
    ]),
  };
}
