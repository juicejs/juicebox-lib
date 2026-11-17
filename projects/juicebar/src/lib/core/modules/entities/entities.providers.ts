import {inject, makeEnvironmentProviders, provideEnvironmentInitializer} from '@angular/core';
import {ENTITIES_CUSTOMIZATION, EntitiesCustomization, JuicebarFeature} from '../../../config/base-app.config';
import {JuiceboxService} from '../../shared/services/Juicebox.service';
import {EntitiesTranslationPipe} from './i18n/entities.translation';
import {buildEntitiesRoute} from './entities.route';
import {EntitiesService} from './entities.service';

/**
 * The customers module (the old juicebox `entities`), with a sidebar entry for `entities:role` and the customers in
 * the admin's search. The old juicebox chose a customer's tabs by the project's title; a project names them here,
 * e.g. `provideEntities({options: {hiddenTabs: ['wallets'], extraTabs: ['media', 'api-access']}})`, and adds the
 * tabs of its other modules with `componentOverrides` (`routePath: ['details/:id', 'tickets']`, with a `tab`).
 */
export function provideEntities(customization?: EntitiesCustomization): JuicebarFeature {
  return {
    routes: buildEntitiesRoute(customization?.componentOverrides),
    providers: makeEnvironmentProviders([
      EntitiesTranslationPipe,
      ...(customization?.providers ?? []),
      {provide: ENTITIES_CUSTOMIZATION, useValue: customization ?? {}},
      provideEnvironmentInitializer(() => {
        const entities = inject(EntitiesService);
        inject(JuiceboxService).registerSearchProvider(
          {
            // As in the old juicebox: up to 10 customers whose first name or e-mail address contains the text
            search: async (token: string) => {
              const results = await entities.fetch(0, 10, {
                filter: [],
                search: {
                  terms: ['firstname', 'email'].map(property => ({property, fullText: true, language: false as const, term: token})),
                },
              });
              if (!results?.success) return [];
              return (results.payload?.items ?? []).map(entity => ({
                title: entity.name ? entity.name : `${entity.firstname} ${entity.lastname}`,
                details: `${entity.type} - ${entity.email}`,
                link: `main/entities/details/${entity._id}/details-entity`,
              }));
            },
          },
          'Entities',
          'fa-address-book',
          'entities:role',
        );
      }),
    ]),
  };
}
