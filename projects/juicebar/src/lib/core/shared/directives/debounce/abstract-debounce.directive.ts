import { Directive, OnDestroy, OnInit, input, output } from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil, debounceTime, distinctUntilChanged, tap } from "rxjs/operators";

/**
 * https://jasonwhite.xyz/posts/2020/10/16/angular-creating-a-debounce-directives/
 */
@Directive()
export abstract class AbstractDebounceDirective implements OnInit, OnDestroy {
    readonly debounceTime = input<number>(500);
    readonly onEvent = output<unknown>();

    protected emitEvent$ = new Subject<unknown>();
    protected subscription$ = new Subject<void>();

    ngOnInit(): void {
        this.emitEvent$
            .pipe(
                takeUntil(this.subscription$),
                debounceTime(this.debounceTime()),
                distinctUntilChanged(),
                tap(value => this.emitChange(value))
            )
            .subscribe();
    }

    public emitChange(value: unknown): void {
        this.onEvent.emit(value);
    }

    ngOnDestroy(): void {
        this.subscription$.next();
        this.subscription$.complete();
    }
}
