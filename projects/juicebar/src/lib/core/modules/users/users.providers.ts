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
            // First name, last name or email. The users list's fetch (same scoping as the list) needs all of its terms
            // to match, so each field is its own request and the results are merged; two or more words are also
            // tried as first name + last name.
            search: async (token: string) => {
              const organisationId = juicebox.getUser().organisation_id;
              const term = (property: string, value: string) => ({ property, term: value, fullText: true, language: false });
              const queries = [[term('firstname', token)], [term('lastname', token)], [term('email', token)]];
              const words = token.trim().split(/\s+/);
              if (words.length > 1) queries.push([term('firstname', words[0]), term('lastname', words.slice(1).join(' '))]);

              const results = await Promise.all(queries.map(filter =>
                userService.fetch(organisationId, 0, 10, { dir: 'asc', prop: 'lastname' }, filter).catch(() => null)));
              const users = new Map<string, any>();
              for (const result of results) {
                if (!result?.success) continue;
                for (const user of result.payload.items) users.set(user._id, user);
              }
              return [...users.values()]
                .sort((a, b) => `${a.lastname ?? ''} ${a.firstname ?? ''}`.localeCompare(`${b.lastname ?? ''} ${b.firstname ?? ''}`))
                .slice(0, 10)
                .map(user => ({
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
