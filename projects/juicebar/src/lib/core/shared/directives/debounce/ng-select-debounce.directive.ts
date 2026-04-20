import { AbstractDebounceDirective } from './abstract-debounce.directive';
import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: "[debounce]"
})
export class NgSelectDebounceDirective extends AbstractDebounceDirective {

    constructor() {
        super();
    }

    @HostListener("search", ["$event"])
    public onKeyUp(event: any): void {
        this.emitEvent$.next(event);
    }
}
