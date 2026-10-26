import { Injectable, inject, ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { SnackbarComponent, SnackbarType } from './snackbar.component';

export interface SnackbarConfig {
  /** Milliseconds until the snackbar closes. 0 keeps it open until the user dismisses it. */
  duration?: number;
  type?: SnackbarType;
  title?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SnackbarService {
  private appRef = inject(ApplicationRef);
  private injector = inject(EnvironmentInjector);
  private container?: HTMLElement;

  /** `config` may be a plain duration in milliseconds. */
  open(message: string, action?: string, config: number | SnackbarConfig = {}) {
    const { duration = 3000, type, title } = typeof config === 'number' ? { duration: config } : config;

    const componentRef = createComponent(SnackbarComponent, {
      environmentInjector: this.injector
    });
    componentRef.setInput('message', message);
    componentRef.setInput('action', action ?? '');
    componentRef.setInput('title', title ?? '');
    componentRef.setInput('type', type);

    this.appRef.attachView(componentRef.hostView);
    const element = componentRef.location.nativeElement as HTMLElement;
    this.getContainer().appendChild(element);

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const close = () => {
      clearTimeout(timeoutId);
      if (componentRef.hostView.destroyed) return;
      this.appRef.detachView(componentRef.hostView);
      componentRef.destroy();
      element.remove();
    };

    componentRef.instance.dismissed.subscribe(close);
    if (duration > 0) {
      timeoutId = setTimeout(close, duration);
    }

    return componentRef.instance;
  }

  private getContainer(): HTMLElement {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'app-snackbar-container';
      document.body.appendChild(this.container);
    }
    return this.container;
  }
}
