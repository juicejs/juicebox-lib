import { Directive } from '@angular/core';
import { AbstractDebounceDirective } from './abstract-debounce.directive';

@Directive({
  selector: "[debounce]",
  host: {
    '(search)': 'onKeyUp($event)',
  },
})
export class NgSelectDebounceDirective extends AbstractDebounceDirective {
    public onKeyUp(event: unknown): void {
        this.emitEvent$.next(event);
    }
}
