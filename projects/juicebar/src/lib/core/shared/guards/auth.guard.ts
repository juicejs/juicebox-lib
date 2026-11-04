import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { JuiceboxService } from '../services/Juicebox.service';

/** Sends a logged-out user to the login page, remembering the page they wanted (`postLoginRedirect`) */
export const authGuard: CanActivateFn = (route, state) => {
  if (inject(JuiceboxService).isLoggedIn()) {
    return true;
  }

  if (state.url && state.url !== '/' && !state.url.startsWith('/login')) {
    sessionStorage.setItem('postLoginRedirect', state.url);
  }
  return inject(Router).createUrlTree(['/login']);
};
