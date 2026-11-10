import {inject, Injectable, InjectionToken, Signal} from '@angular/core';

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
 * What a module's listing showed last (page, sort, filters). The compact listing next to an open record starts from
 * it, so it has the rows the record was opened from.
 */
@Injectable({providedIn: 'root'})
export class ListingStateService {
  private readonly states = new Map<string, unknown>();

  save(module: string, state: unknown): void {
    this.states.set(module, state);
  }

  restore<T>(module: string): T | undefined {
    return this.states.get(module) as T | undefined;
  }
}
