import {Routes} from '@angular/router';

export class RouteConfiguration{

    routes: Routes = [];

    constructor(){}

    setMain(routes: Routes){
        this.routes = routes;
    }

    addRoute(path: string, routes: Routes){
        routes[0].path = path;
        this.routes[0].children.push(routes[0]);
    }

    getRoutes(): Routes{
        return this.routes;
    }

}