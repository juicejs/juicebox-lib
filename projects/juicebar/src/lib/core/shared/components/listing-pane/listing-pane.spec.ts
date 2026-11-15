import {Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {ListingStateService} from './listing-pane';

@Component({template: ''})
class BlankComponent {}

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
              {path: '', component: BlankComponent, data: {listingPane: true}},
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
});
