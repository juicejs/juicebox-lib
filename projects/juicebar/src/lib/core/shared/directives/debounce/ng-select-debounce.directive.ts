import { Directive, inject } from '@angular/core';
import { AbstractDebounceDirective } from './abstract-debounce.directive';
import { SelectComponent } from '../../../../ui-components/select/select.component';

/**
 * Debounced search for a select, as the old juicebox used it on ng-select: `(onEvent)` gets `{ term }` (old code reads
 * `event.term`). Works with app-select's `searchChange` (a string) and with anything emitting ng-select's `(search)`.
 * Like ng-select's `(search)`, only typing counts: the empty search app-select reports when its panel closes doesn't.
 */
@Directive({
  selector: "[debounce]",
  host: {
    '(search)': 'onKeyUp($event)',
    '(searchChange)': 'onSearchChange($event)',
  },
})
export class NgSelectDebounceDirective extends AbstractDebounceDirective {
    private readonly select = inject(SelectComponent, { self: true, optional: true });

    public onKeyUp(event: unknown): void {
        this.emitEvent$.next(event);
    }

    public onSearchChange(term: string): void {
        if (this.select && !this.select.isOpen()) return;
        this.emitEvent$.next({ term });
    }
}
