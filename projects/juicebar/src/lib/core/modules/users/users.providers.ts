import { inject, provideEnvironmentInitializer, makeEnvironmentProviders } from '@angular/core';
import { UserTranslationPipe } from './i18n/user.translation';
import { UsersService } from './users.service';
import { JuiceboxService } from '../../shared/services/Juicebox.service';
import { ModuleCustomization, USERS_CUSTOMIZATION, JuicebarFeature } from '../../../config/base-app.config';
import { buildUsersRoute } from './users.route';

export function provideUsers(customization?: ModuleCustomization): JuicebarFeature {
  console.log('[juicebar] provideUsers called with customization:', customization);
  return {
    routes: buildUsersRoute(customization?.componentOverrides),
    providers: makeEnvironmentProviders([
      UserTranslationPipe,
      {
        provide: USERS_CUSTOMIZATION,
        useValue: customization ?? {},
      },
      provideEnvironmentInitializer(() => {
        const juicebox = inject(JuiceboxService);
        const userService = inject(UsersService);

        juicebox.registerSearchProvider(
          {
            search: async (token: string) => {
              const results = await userService.search([
                { property: 'firstname', fullText: true, language: false, term: token },
                { property: 'lastname', fullText: true, language: false, term: token },
                { property: 'email', fullText: true, language: false, term: token },
              ], 0, 10);
              return results.payload.items.map(user => ({
                title: user.firstname + ' ' + user.lastname,
                details: user.email + ' - ',
                link: 'main/users/details/' + user._id + '/details-user',
              }));
            },
          },
          'Users',
          'fa-users',
          'users#role'
        );
      }),
    ]),
  };
}
