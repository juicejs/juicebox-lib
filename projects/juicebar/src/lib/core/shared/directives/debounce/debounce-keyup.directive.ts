import { Directive } from "@angular/core";
import { AbstractDebounceDirective } from "./abstract-debounce.directive";

@Directive({
  selector: "input[debounceKeyUp]",
  host: {
    '(keyup)': 'onKeyUp($event)',
  },
})
export class DebounceKeyupDirective extends AbstractDebounceDirective {
    public onKeyUp(event: KeyboardEvent): void {
        event.preventDefault();
        this.emitEvent$.next(event);
    }
}
