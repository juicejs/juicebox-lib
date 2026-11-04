import { Directive, ElementRef, OnDestroy, effect, inject, input, signal, untracked } from '@angular/core';
import { Subscription, Observable, isObservable, from } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ButtonComponent } from '../../../ui-components/button/button.component';

/** The promise button pressed last; the next value it receives shows on it */
let lastPressed: PromiseButtonDirective | null = null;

/**
 * Shows a button as loading, and disables it, while the bound promise, observable or subscription runs,
 * or while it is bound to `true` (as angular2-promise-buttons did in the old juicebox).
 *
 * Only the button that was pressed shows it, as in the old app (`handleCurrentBtnOnly`): buttons that share one
 * promise variable don't all spin. Unlike the old library, a press never re-uses a promise that has already finished.
 *
 * An app-button is disabled through its own state. On a plain `<button>` the directive takes over `[disabled]`,
 * as the old one did, and only removes a `disabled` attribute it set itself, so a disable from a permission
 * directive (or a static `disabled`) stays.
 */
@Directive({
  selector: '[promiseBtn]',
  host: {
    '[class.app-button-loading]': 'isLoading()',
    '[attr.aria-busy]': 'isLoading()',
    '(click)': 'pressed()',
  }
})
export class PromiseButtonDirective implements OnDestroy {
  private subscription?: Subscription;
  /** Counts the bound values, so a callback of a replaced one can't end the loading state */
  private run = 0;
  /** The `disabled` attribute on a plain button was set by this directive */
  private disabledByDirective = false;
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly button = inject(ButtonComponent, { self: true, optional: true });
  protected readonly isLoading = signal(false);

  promiseBtn = input<Promise<any> | Observable<any> | Subscription | boolean | null>(null);
  /** The host's `[disabled]`; an app-button also receives it as its own input */
  disabled = input<boolean | undefined>(undefined);

  constructor() {
    effect(() => {
      const value = this.promiseBtn();
      untracked(() => this.watch(value));
    });

    effect(() => {
      const loading = this.isLoading();
      const disabled = !!this.disabled();
      untracked(() => {
        if (this.button) this.button.setLoading(loading);
        else this.setNativeDisabled(loading || disabled);
      });
    });
  }

  ngOnDestroy(): void {
    if (lastPressed === this) lastPressed = null;
    this.stop();
  }

  protected pressed() {
    lastPressed = this;
  }

  private watch(value: Promise<any> | Observable<any> | Subscription | boolean | null) {
    // false (the end of a `true`) or nothing: not loading
    if (!value) {
      this.stop();
      return;
    }
    // A new value shows only on the button pressed to start it; the others bound to it ignore it
    if (lastPressed !== this) return;
    lastPressed = null;

    const run = this.stop();
    const done = () => {
      if (run === this.run) this.isLoading.set(false);
    };

    // true: loading until the value is set back to false
    if (value === true) {
      this.isLoading.set(true);
      return;
    }
    if (value instanceof Subscription) {
      this.isLoading.set(!value.closed);
      value.add(done);
      return;
    }

    this.isLoading.set(true);
    const observable = isObservable(value) ? value : from(value);
    this.subscription = observable.pipe(finalize(done)).subscribe({ error: () => {} });
  }

  /** Ends the current loading state; returns the number of the next run */
  private stop(): number {
    this.subscription?.unsubscribe();
    this.subscription = undefined;
    this.isLoading.set(false);
    return ++this.run;
  }

  private setNativeDisabled(disabled: boolean) {
    const el = this.el.nativeElement;
    if (disabled) {
      if (!el.hasAttribute('disabled')) {
        el.setAttribute('disabled', 'disabled');
        this.disabledByDirective = true;
      }
    } else if (this.disabledByDirective) {
      el.removeAttribute('disabled');
      this.disabledByDirective = false;
    }
  }
}
