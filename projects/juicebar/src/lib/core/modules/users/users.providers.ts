import { inject, provideEnvironmentInitializer, makeEnvironmentProviders } from '@angular/core';
import { UserTranslationPipe } from './i18n/user.translation';
import { UsersService } from './users.service';
import { JuiceboxService } from '../../shared/services/Juicebox.service';
import { UsersCustomization, USERS_CUSTOMIZATION, JuicebarFeature } from '../../../config/base-app.config';
import { buildUsersRoute } from './users.route';

export function provideUsers(customization?: UsersCustomization): JuicebarFeature {
  return {
    routes: buildUsersRoute(customization?.componentOverrides),
    providers: makeEnvironmentProviders([
      UserTranslationPipe,
      ...(customization?.providers ?? []),
      {
        provide: USERS_CUSTOMIZATION,
        useValue: customization ?? {},
      },
      provideEnvironmentInitializer(() => {
        const juicebox = inject(JuiceboxService);
        const userService = inject(UsersService);

        juicebox.registerSearchProvider(
          {
            // As in the old juicebox: one users.search request, where the term matches first name, last name or email
            search: async (token: string) => {
              const results = await userService.search(
                ['firstname', 'lastname', 'email'].map(property => ({ property, fullText: true, language: false, term: token })),
                0,
                10,
              );
              if (!results?.success) return [];
              return results.payload.items.map(user => ({
                title: `${user.firstname} ${user.lastname}`,
                details: user.email,
                link: 'main/users/details/' + user._id + '/details-user',
              }));
            },
          },
          'Users',
          'fa-users',
          'users:role',
        );
      }),
    ]),
  };
}
