import {Component, EnvironmentInjector, Injector, runInInjectionContext, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {RouterTestingHarness} from '@angular/router/testing';
import {injectListingState, LISTING_PANE, ListingStateService} from './listing-pane';

@Component({template: ''})
class BlankComponent {}

@Component({template: ''})
class UsersListingComponent {
  readonly state = injectListingState<{page: number}>('users');
}

describe('ListingStateService', () => {
  let router: Router;
  let states: ListingStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{
        path: 'main',
        children: [
          {
            path: 'users',
            children: [
              {path: '', component: UsersListingComponent, data: {listingPane: true}},
              {path: 'user-wizard', component: BlankComponent},
              {path: 'details/:id', component: BlankComponent, data: {splitView: true}},
            ],
          },
          {path: 'location', component: BlankComponent},
          {path: 'users-old', component: BlankComponent},
        ],
      }])],
    });
    router = TestBed.inject(Router);
    states = TestBed.inject(ListingStateService);
  });

  it('keeps a listing\'s state while staff open its records and come back', async () => {
    await router.navigateByUrl('/main/users');
    states.save('users', {page: 3});
    await router.navigateByUrl('/main/users/details/u1');
    await router.navigateByUrl('/main/users/user-wizard');
    await router.navigateByUrl('/main/users?page=3');
    expect(states.restore('users')).toEqual({page: 3});
  });

  it('keeps what the compact list next to a record saved for its listing', async () => {
    await router.navigateByUrl('/main/users/details/u1');
    states.save('users', {page: 4});
    await router.navigateByUrl('/main/users');
    expect(states.restore('users')).toEqual({page: 4});
  });

  it('forgets a listing\'s state once staff go to another module', async () => {
    await router.navigateByUrl('/main/users');
    states.save('users', {page: 3});
    await router.navigateByUrl('/main/location');
    expect(states.restore('users')).toBeUndefined();
    await router.navigateByUrl('/main/users');
    expect(states.restore('users')).toBeUndefined();
  });

  it('does not take an address that only begins like the listing\'s for one under it', async () => {
    await router.navigateByUrl('/main/users');
    states.save('users', {page: 3});
    await router.navigateByUrl('/main/users-old');
    expect(states.restore('users')).toBeUndefined();
  });

  it('forgets a listing\'s state on request, after a record was created', async () => {
    await router.navigateByUrl('/main/users');
    states.save('users', {page: 3});
    states.forget('users');
    expect(states.restore('users')).toBeUndefined();
  });

  describe('injectListingState', () => {
    it('files the state under the listing\'s own route, also when it saves after the next page is on screen', async () => {
      const harness = await RouterTestingHarness.create();
      const listing = await harness.navigateByUrl('/main/users', UsersListingComponent);
      await harness.navigateByUrl('/main/users/user-wizard');
      // As a listing that saves when it is destroyed
      listing.state.save({page: 3});
      await harness.navigateByUrl('/main/users/details/u1');
      expect(listing.state.restore()).toEqual({page: 3});
      await harness.navigateByUrl('/main/location');
      expect(listing.state.restore()).toBeUndefined();
    });

    it('files the compact list\'s state under the listing\'s address in the split view', async () => {
      await router.navigateByUrl('/main/users/details/u1');
      const pane = Injector.create({
        providers: [{provide: LISTING_PANE, useValue: {activeId: signal('u1'), address: '/main/users'}}],
        parent: TestBed.inject(EnvironmentInjector),
      });
      const state = runInInjectionContext(pane, () => injectListingState<{page: number}>('users'));
      state.save({page: 4});
      await router.navigateByUrl('/main/users');
      expect(state.restore()).toEqual({page: 4});
    });
  });
});
