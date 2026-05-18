import { Directive, OnDestroy, effect, inject, input, signal } from '@angular/core';
import { Subscription, Observable, isObservable, from } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ButtonComponent } from '../../../ui-components/button/button.component';

@Directive({
  selector: '[promiseBtn]',
  host: {
    '[class.app-button-loading]': 'isLoading()',
    '[disabled]': 'isLoading() || button?.disabled() || null',
    '[attr.aria-busy]': 'isLoading()',
  }
})
export class PromiseButtonDirective implements OnDestroy {
  private subscription?: Subscription;
  protected readonly button = inject(ButtonComponent, { optional: true });
  protected readonly isLoading = signal(false);

  promiseBtn = input<Promise<any> | Observable<any> | null>(null);

  constructor() {
    effect(() => {
      const promise = this.promiseBtn();

      this.subscription?.unsubscribe();
      this.isLoading.set(false);

      if (!promise) return;

      this.isLoading.set(true);

      const observable = isObservable(promise) ? promise : from(promise);
      this.subscription = observable.pipe(
        finalize(() => this.isLoading.set(false))
      ).subscribe({ next: () => {}, error: () => {} });
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
