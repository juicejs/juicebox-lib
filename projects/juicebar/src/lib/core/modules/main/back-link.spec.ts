import {backLinkShown} from './back-link';

describe('backLinkShown', () => {
  it('shows the way back on a record and other pages under a module', () => {
    expect(backLinkShown('/main/users/details/1/details-user', 'main/users')).toBe(true);
    expect(backLinkShown('/main/location/location-wizard', '/main/location')).toBe(true);
  });

  it('never on a module\'s own page, also while the link is still the last page\'s', () => {
    expect(backLinkShown('/main/users', 'main/users')).toBe(false);
    expect(backLinkShown('/main/location?page=2', 'main/users')).toBe(false);
    expect(backLinkShown('/main/exports', '/main/users')).toBe(false);
  });

  it('not without a link, nor to the page itself', () => {
    expect(backLinkShown('/main/users/details/1', '')).toBe(false);
    expect(backLinkShown('/main/user-profile/details', null)).toBe(false);
    expect(backLinkShown('/main/things/list', 'main/things/list/')).toBe(false);
  });
});
