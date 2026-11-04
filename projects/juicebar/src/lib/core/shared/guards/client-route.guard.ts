import { inject, isDevMode } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { ClientRoutesService } from '../services/client-routes.service';
import { JuiceboxService } from '../services/Juicebox.service';

/**
 * Client routes per organisation (`options.client_routes`), as in the old juicebox: a logged-in user who is not on
 * their organisation's route (e.g. after switching organisation) is sent to it; a logged-out user goes back to
 * `client_route_main`. Off in dev mode. Used for canActivate and canActivateChild.
 */
export const clientRouteGuard: CanActivateFn = async () => {
    if (isDevMode())
        return true;

    const juiceboxService = inject(JuiceboxService);
    const clientRoutes = inject(ClientRoutesService);

    const isLoggedIn = juiceboxService.isLoggedIn();
    if (isLoggedIn) {
        const options = juiceboxService.getOptions();

        // client routing is not set (or the options aren't loaded)
        if (!options?.client_routes)
            return true;

        if (!juiceboxService.getMainOrganisationRoute())
            juiceboxService.setMainOrganisationRoute(options.client_route_main);

        // user switched organisation or not on client route -> change route to new organisation route
        if (!(await clientRoutes.isOnClientRoute())) {
            const client_route = juiceboxService.getOrganisationRoute();
            // sets client route to localstorage and session storage (needed if user opens juicebox in new tab)
            juiceboxService.setOrganisationRoute(client_route);
            document.location.replace(juiceboxService.getEndPoint() + '/' + client_route);
        }

        return true;
    } else {
        await clientRoutes.routeToRoot();
        return true;
    }
};
