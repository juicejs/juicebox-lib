import { Injectable, inject, isDevMode } from '@angular/core';
import { CanActivate, CanActivateChild } from '@angular/router';
import { ClientRoutesService } from '../services/client-routes.service';
import { JuiceboxService } from '../services/Juicebox.service';

/**
 * Client routes per organisation (`options.client_routes`), as in the old juicebox: a logged-in user who is not on
 * their organisation's route (e.g. after switching organisation) is sent to it; a logged-out user goes back to
 * `client_route_main`. Off in dev mode.
 */
@Injectable({
    providedIn: 'root'
})
export class ClientRouteGuard implements CanActivate, CanActivateChild {
    private juiceboxService = inject(JuiceboxService);
    private clientRoutes = inject(ClientRoutesService);

    canActivateChild(): Promise<boolean> {
        return this.activation();
    }

    canActivate(): Promise<boolean> {
        return this.activation();
    }

    private async activation(): Promise<boolean> {
        if (isDevMode())
            return true;

        const isLoggedIn = this.juiceboxService.isLoggedIn();
        if (isLoggedIn) {
            const options = this.juiceboxService.getOptions();

            // client routing is not set (or the options aren't loaded)
            if (!options?.client_routes)
                return true;

            if (!this.juiceboxService.getMainOrganisationRoute())
                this.juiceboxService.setMainOrganisationRoute(options.client_route_main);

            // user switched organisation or not on client route -> change route to new organisation route
            if (!(await this.clientRoutes.isOnClientRoute())) {
                const client_route = this.juiceboxService.getOrganisationRoute();
                // sets client route to localstorage and session storage (needed if user opens juicebox in new tab)
                this.juiceboxService.setOrganisationRoute(client_route);
                document.location.replace(this.juiceboxService.getEndPoint() + '/' + client_route);
            }

            return true;
        } else {
            await this.clientRoutes.routeToRoot();
            return true;
        }
    }
}
