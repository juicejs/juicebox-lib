import {
  Directive,
  Input,
  ElementRef,
  Renderer2,
  OnDestroy,
  inject,
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

  // Signals for reactive state
  isLoading = signal(false);

  @Input() spinnerTemplate = `
    <mat-spinner diameter="20" style="display: inline-block; margin-right: 8px;"></mat-spinner>
  `;

  @Input() loadingText = 'Loading...';
  @Input() disableWhileLoading = true;
  @Input() showSpinner = true;

  @Input() set matPromiseBtn(promise: Promise<any> | Observable<any> | null) {
    if (!promise) {
      this.resetButton();
      return;
    }

    this.setLoadingState();

    // Convert promise to observable if needed
    const observable = isObservable(promise) ? promise : from(promise);

    this.subscription?.unsubscribe();
    this.subscription = observable.pipe(
      finalize(() => this.resetButton())
    ).subscribe({
      next: () => {},
      error: () => {} // Handle in finalize
    });
  }

  private setLoadingState(): void {
    const element = this.elementRef.nativeElement;

    // Store original state
    this.originalContent = element.innerHTML;
    this.originalDisabled = element.disabled;
    this.isLoading.set(true);

    // Disable button if requested
    if (this.disableWhileLoading) {
      this.renderer.setProperty(element, 'disabled', true);
      this.renderer.addClass(element, 'mat-button-disabled');
    }

    // Add loading class
    this.renderer.addClass(element, 'mat-button-loading');

    // Update button content
    if (this.showSpinner) {
      const loadingContent = `
        ${this.spinnerTemplate}
        <span>${this.loadingText}</span>
      `;
      this.renderer.setProperty(element, 'innerHTML', loadingContent);
    }
  }

  private resetButton(): void {
    const element = this.elementRef.nativeElement;
    this.isLoading.set(false);

    // Restore original content
    if (this.originalContent !== undefined) {
      this.renderer.setProperty(element, 'innerHTML', this.originalContent);
    }

    // Restore disabled state
    if (this.disableWhileLoading) {
      this.renderer.setProperty(element, 'disabled', this.originalDisabled || false);
      this.renderer.removeClass(element, 'mat-button-disabled');
    }

    // Remove loading class
    this.renderer.removeClass(element, 'mat-button-loading');

    this.originalContent = undefined;
    this.originalDisabled = undefined;
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
