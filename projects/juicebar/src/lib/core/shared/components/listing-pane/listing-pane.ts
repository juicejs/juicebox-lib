import {inject, Injectable, InjectionToken, Signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRouteSnapshot, NavigationEnd, Router} from '@angular/router';
import {filter} from 'rxjs';

/**
 * The split view: a record's route has `data: {splitView: true}` and the listing route next to it
 * `data: {listingPane: true}`. While the record is open, the main component shows that listing as a compact list
 * beside it. The listing reads this pane to know it is the compact one.
 */
export interface ListingPane {
  /** The record that is open, to mark its row */
  readonly activeId: Signal<string | null>;
}

export const LISTING_PANE = new InjectionToken<ListingPane>('LISTING_PANE');

/** The pane a listing is shown in, or null when it is the page itself */
export function injectListingPane(): ListingPane | null {
  return inject(LISTING_PANE, {optional: true});
}

/**
 * What a module's listing showed last (page, page size, sort, filters). The listing starts from it when staff come
 * back from a record (by the breadcrumb, the browser's Back or the sidebar), and so does the compact list next to an
 * open record, so both show the rows the record was opened from.
 *
 * A state belongs to its listing's address: it is kept while staff stay on the listing and the pages under it (its
 * records, a wizard), and forgotten once they go anywhere else, so the listing opened from another module starts on
 * its first page.
 */
@Injectable({providedIn: 'root'})
export class ListingStateService {
  private readonly router = inject(Router);
  /** Each listing's state, with the address of the listing it belongs to */
  private readonly states = new Map<string, {address: string; state: unknown}>();

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(event => {
        const path = this.pathOf(event.urlAfterRedirects);
        for (const [module, {address}] of this.states) {
          const within = path === address || path.startsWith(address === '/' ? address : address + '/');
          if (!within) this.states.delete(module);
        }
      });
  }

  save(module: string, state: unknown): void {
    this.states.set(module, {address: this.listingAddress(), state});
  }

  restore<T>(module: string): T | undefined {
    return this.states.get(module)?.state as T | undefined;
  }

  /**
   * The address of the listing on screen: the route marked `listingPane`, or, while a record (`splitView`) is open,
   * the address its listing has next to it. A listing without the split view is the address shown.
   */
  private listingAddress(): string {
    const segments: string[] = [];
    let route: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
    while (route) {
      const data = route.routeConfig?.data;
      if (data?.['splitView']) break;
      segments.push(...route.url.map(segment => segment.path));
      if (data?.['listingPane']) break;
      route = route.firstChild;
    }
    return '/' + segments.join('/');
  }

  /** The address without its query, fragment and matrix parameters */
  private pathOf(url: string): string {
    const segments = this.router.parseUrl(url).root.children['primary']?.segments ?? [];
    return '/' + segments.map(segment => segment.path).join('/');
  }
}
