import { EnvironmentProviders, Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { BASE_APP_CONFIG, BaseAppConfig, USERS_CUSTOMIZATION } from '../lib/config/base-app.config';
import { JuiceboxService } from '../lib/core/shared/services/Juicebox.service';

/** What the lib's components need in a unit test: a router, a backend that never answers and the app config */
export function provideJuicebarTesting(): (Provider | EnvironmentProviders)[] {
  const config: BaseAppConfig = { apiUrl: '', appName: 'Juicebar test', modules: [] };
  return [
    provideRouter([]),
    provideHttpClient(),
    provideHttpClientTesting(),
    { provide: BASE_APP_CONFIG, useValue: config },
    { provide: USERS_CUSTOMIZATION, useValue: {} },
  ];
}

/** Signs in a user without roles, with empty options, as after a login */
export function signInTestUser(): void {
  const juicebox = TestBed.inject(JuiceboxService);
  juicebox.setUser({ _id: 'test-user', firstname: 'Test', lastname: 'User', email: 'test@example.com', roles: [], attributes: {} });
  juicebox.setOptions({});
}
