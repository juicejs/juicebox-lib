import {inject, Injectable, InjectionToken, Signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd, Router} from '@angular/router';
import {filter} from 'rxjs';

/**
 * The split view: a record's route has `data: {splitView: true}` and the listing route next to it
 * `data: {listingPane: true}`. While the record is open, the main component shows that listing as a compact list
 * beside it. The listing reads this pane to know it is the compact one.
 */
export interface ListingPane {
  /** The record that is open, to mark its row */
  readonly activeId: Signal<string | null>;
  /** The listing's own address (the open record's parent route), which the listing's state belongs to */
  readonly address?: string;
}

export const LISTING_PANE = new InjectionToken<ListingPane>('LISTING_PANE');

/** The pane a listing is shown in, or null when it is the page itself */
export function injectListingPane(): ListingPane | null {
  return inject(LISTING_PANE, {optional: true});
}

/** A listing's state in `ListingStateService`, under the address the listing belongs to */
export interface ListingState<T> {
  /** What the listing showed last, if staff stayed on it and the pages under its address since */
  restore(): T | undefined;
  /** Keeps what the listing shows now: call it each time the listing reads its rows */
  save(state: T): void;
}

/**
 * The state of the listing `module` (page, page size, sort, filters): the listing restores it when it starts, as the
 * page and as the compact list next to an open record, and saves it each time it reads its rows. Call it in the
 * listing component's injection context. The address the state belongs to is fixed here: the listing's own route, or
 * as the compact list, the listing's address in the split view. So a save after an `await` or when the listing is
 * destroyed still files it under the listing.
 */
export function injectListingState<T>(module: string): ListingState<T> {
  const states = inject(ListingStateService);
  const address = injectListingPane()?.address ?? addressOf(inject(ActivatedRoute).snapshot);
  return {
    restore: () => states.restore<T>(module),
    save: state => states.save(module, state, address),
  };
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

  /**
   * Keeps a listing's state under its address. Without one, the address is read from the route shown at the time:
   * call it while the listing is on screen, or use `injectListingState`, which fixes the address when the listing starts.
   */
  save(module: string, state: unknown, address = this.listingAddress()): void {
    this.states.set(module, {address, state});
  }

  restore<T>(module: string): T | undefined {
    return this.states.get(module)?.state as T | undefined;
  }

  /** A record was created: the listing starts afresh, on its first page */
  forget(module: string): void {
    this.states.delete(module);
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

/** A route's address, without its parameters */
function addressOf(route: ActivatedRouteSnapshot): string {
  return '/' + route.pathFromRoot.flatMap(part => part.url.map(segment => segment.path)).join('/');
}
