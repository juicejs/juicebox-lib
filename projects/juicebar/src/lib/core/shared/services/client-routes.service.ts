import {Injectable} from '@angular/core';
import { ConfigurationService } from './configuration.service';
import { JuiceboxService } from './Juicebox.service';

@Injectable({
  providedIn: "root"
})
export class ClientRoutesService {

    constructor(
        private juicebox: JuiceboxService,
        private configuration: ConfigurationService) {
    }


    async fetchClientRoute() {
        // fetch juicebox configuration
        const config = await this.configuration.getByKey("juicebox");
        if(config?.payload?.options && !config.payload.options.client_routes)
            return "";

        const org = await this.juicebox.getLoggedInOrganisation();
        if(!org.client_route)
            return "";


        this.juicebox.setOrganisationRoute(org.client_route);
        return org.client_route;
    }

    async isOnClientRoute(): Promise<boolean> {
        // check if route set on current organisation is matching window.location
        const client_route = this.juicebox.getOrganisationRoute();

        const old_route = localStorage.getItem("client_route_switch")

        if(old_route && !client_route)
            await this.routeToRoot();

        if(!client_route)
            return true;


        const pathname = window.location.href.replace(this.juicebox.getEndPoint(), "");
        return pathname.includes(client_route);
    }

    async routeToRoot() {
        const client_route_main = this.juicebox.getMainOrganisationRoute();

        if(!client_route_main)
            return;

        const old_route = localStorage.getItem("client_route_switch");
        const client_route = this.juicebox.getOrganisationRoute();

        localStorage.removeItem("client_route_switch");
        this.juicebox.removeOrganisationRoute();
        if(old_route || client_route)
            document.location.replace(client_route_main || "/");

    }

}
