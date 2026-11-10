import {Component} from '@angular/core';
import {Routes} from '@angular/router';
import {applyComponentOverrides} from './route-customization';

@Component({template: ''})
class ListingComponent {}

@Component({template: ''})
class OwnComponent {}

const moduleRoutes = (): Routes => [{
  path: 'things',
  children: [
    {path: '', component: ListingComponent, data: {listingPane: true, kept: 1}},
    {path: 'details/:id', component: ListingComponent, data: {splitView: true}},
  ],
}];

describe('applyComponentOverrides', () => {
  it('leaves the split view of a module that is not overridden', () => {
    const [root] = applyComponentOverrides(moduleRoutes());
    expect(root.children![0].data).toEqual({listingPane: true, kept: 1});
    expect(root.children![1].data).toEqual({splitView: true});
  });

  it('a project\'s own listing is not shown as the compact list next to the module\'s records', async () => {
    const [root] = applyComponentOverrides(moduleRoutes(), [{routePath: [''], component: OwnComponent}]);
    const listing = root.children![0];
    expect(await listing.loadComponent!()).toBe(OwnComponent);
    expect(listing.data).toEqual({listingPane: false, kept: 1});
  });

  it('does not change the routes it was given', () => {
    const routes = moduleRoutes();
    applyComponentOverrides(routes, [{routePath: [''], component: OwnComponent}]);
    expect(routes[0].children![0].data).toEqual({listingPane: true, kept: 1});
    expect(routes[0].children![0].component).toBe(ListingComponent);
  });
});
