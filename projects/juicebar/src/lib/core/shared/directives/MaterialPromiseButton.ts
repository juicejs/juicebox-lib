import {
  Directive,
  ElementRef,
  Renderer2,
  OnDestroy,
  effect,
  inject,
  input,
  signal
} from '@angular/core';
import { Subscription, Observable, isObservable, from } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Directive({
  selector: '[matPromiseBtn]'
})
export class MaterialPromiseButtonDirective implements OnDestroy {
  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);

  private subscription?: Subscription;
  private originalContent?: string;
  private originalDisabled?: boolean;

  isLoading = signal(false);

  spinnerTemplate = input<string>(`
    <mat-spinner diameter="20" style="display: inline-block; margin-right: 8px;"></mat-spinner>
  `);
  loadingText = input<string>('Loading...');
  disableWhileLoading = input<boolean>(true);
  showSpinner = input<boolean>(true);
  matPromiseBtn = input<Promise<any> | Observable<any> | null>(null);

  constructor() {
    effect(() => {
      const promise = this.matPromiseBtn();
      if (!promise) {
        this.resetButton();
        return;
      }

      this.setLoadingState();

      const observable = isObservable(promise) ? promise : from(promise);

      this.subscription?.unsubscribe();
      this.subscription = observable.pipe(
        finalize(() => this.resetButton())
      ).subscribe({
        next: () => {},
        error: () => {}
      });
    });
  }

  private setLoadingState(): void {
    const element = this.elementRef.nativeElement;

    this.originalContent = element.innerHTML;
    this.originalDisabled = element.disabled;
    this.isLoading.set(true);

    if (this.disableWhileLoading()) {
      this.renderer.setProperty(element, 'disabled', true);
      this.renderer.addClass(element, 'mat-button-disabled');
    }

    this.renderer.addClass(element, 'mat-button-loading');

    if (this.showSpinner()) {
      const loadingContent = `
        ${this.spinnerTemplate()}
        <span>${this.loadingText()}</span>
      `;
      this.renderer.setProperty(element, 'innerHTML', loadingContent);
    }
  }

  private resetButton(): void {
    const element = this.elementRef.nativeElement;
    this.isLoading.set(false);

    if (this.originalContent !== undefined) {
      this.renderer.setProperty(element, 'innerHTML', this.originalContent);
    }

    if (this.disableWhileLoading()) {
      this.renderer.setProperty(element, 'disabled', this.originalDisabled || false);
      this.renderer.removeClass(element, 'mat-button-disabled');
    }

    this.renderer.removeClass(element, 'mat-button-loading');

    this.originalContent = undefined;
    this.originalDisabled = undefined;
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
