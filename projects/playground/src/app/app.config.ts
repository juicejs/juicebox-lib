import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideExports, provideJuicebar, provideUsers } from '@juicejs/juicebar';
import { environment } from '../environments/environment';

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
        apiUrl: environment.apiUrl,
        appName: 'Juicebox playground',
        mainRoutes: [],
        modules: [],
      },
      provideUsers(),
      provideExports(),
    ),
  ],
};
