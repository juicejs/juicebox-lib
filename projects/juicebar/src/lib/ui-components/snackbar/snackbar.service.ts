import { Injectable, inject, ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { SnackbarComponent } from './snackbar.component';

@Injectable({
  providedIn: 'root'
})
export class SnackbarService {
  private appRef = inject(ApplicationRef);
  private injector = inject(EnvironmentInjector);

  open(message: string, action?: string, duration: number = 3000) {
    const componentRef = createComponent(SnackbarComponent, {
      environmentInjector: this.injector
    });

    componentRef.instance.message = message;
    componentRef.instance.action = action || '';

    this.appRef.attachView(componentRef.hostView);
    const domElem = (componentRef.hostView as any).rootNodes[0] as HTMLElement;
    document.body.appendChild(domElem);

    setTimeout(() => {
      this.appRef.detachView(componentRef.hostView);
      componentRef.destroy();
    }, duration);

    return componentRef.instance;
  }
}
