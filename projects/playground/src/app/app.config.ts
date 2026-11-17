import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideCategories, provideCommunications, provideConfigurations, provideEntities, provideExports, provideJuicebar, provideLocations, provideUsers } from '@juicejs/juicebar';
import { environment } from '../environments/environment';

/**
 * Dev host for the lib (`npm start`). Imports the lib from source (tsconfig paths),
 * so changes reload without building the package.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideJuicebar(
      {
        apiUrl: environment.apiUrl,
        appName: 'Juicebox playground',
        mainRoutes: [],
        modules: [],
      },
      provideUsers(),
      provideExports(),
      // Quality Circle's locations (staging.quality-circle.com is the default backend)
      provideLocations({
        options: {
          fields: ['email', 'accessibility', 'coordinates'],
          emailHint: '14 Tage vor Veranstaltungsbeginn wird Anzahl Teilnehmer verschickt',
          shortNameMaxLength: 19,
          ownerFilter: true,
          archivableTypes: ['web', 'geo'],
          deletableTypes: ['region', 'web', 'geo'],
        },
      }),
      // Quality Circle's categories
      provideCategories({options: {showInactive: true, confirmDeactivation: true, subcategoriesActive: true}}),
      provideCommunications(),
      provideConfigurations(),
      // Quality Circle's customers: no wallets, and the files and API keys of its assets portal
      provideEntities({options: {hiddenTabs: ['wallets'], extraTabs: ['media', 'api-access']}}),
    ),
  ],
};
