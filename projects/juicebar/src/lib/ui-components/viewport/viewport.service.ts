import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { map } from 'rxjs';

/** At this width and below the admin is laid out for a phone. The styles use the same number in their media queries. */
export const PHONE_MAX_WIDTH = 768;

const PHONE_QUERY = `(max-width: ${PHONE_MAX_WIDTH}px)`;

/** What the template needs to know about the screen, where a media query in the styles is not enough */
@Injectable({ providedIn: 'root' })
export class ViewportService {
  private readonly breakpoints = inject(BreakpointObserver);

  /** The screen is as narrow as a phone's */
  readonly phone = toSignal(
    this.breakpoints.observe(PHONE_QUERY).pipe(map(state => state.matches)),
    { initialValue: this.breakpoints.isMatched(PHONE_QUERY) }
  );
}
