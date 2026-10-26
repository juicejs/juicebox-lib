import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideExports, provideJuicebar, provideUsers } from '@juicejs/juicebar';

/**
 * Dev host for the lib (`npm start`). Imports the lib from source (tsconfig paths),
 * so changes reload without building the package.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideJuicebar(
      {
        apiUrl: 'https://staging.quality-circle.com',
        appName: 'Juicebox playground',
        mainRoutes: [],
        modules: [],
      },
      provideUsers(),
      provideExports(),
    ),
  ],
};
