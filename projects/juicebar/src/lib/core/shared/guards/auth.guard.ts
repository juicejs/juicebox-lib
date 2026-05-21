import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { JuiceboxService } from '../services/Juicebox.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private juiceboxService: JuiceboxService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    const isLoggedIn = this.juiceboxService.isLoggedIn();

    if (isLoggedIn) {
      return true;
    }

    if (state.url && state.url !== '/' && !state.url.startsWith('/login')) {
      sessionStorage.setItem('postLoginRedirect', state.url);
    }
    return this.router.createUrlTree(['/login']);
  }
}
