import { Injectable, inject, Type } from '@angular/core';
import { Dialog, DialogConfig, DialogRef } from '@angular/cdk/dialog';

export { DialogRef, DialogConfig } from '@angular/cdk/dialog';
export { DIALOG_DATA } from '@angular/cdk/dialog';

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  private dialog = inject(Dialog);

  open<T, D = any, R = any>(
    component: Type<T>,
    config?: DialogConfig<D, DialogRef<R>>
  ): DialogRef<R> {
    return this.dialog.open<R, D, T>(component, {
      ...config,
      panelClass: ['app-dialog-panel', ...(config?.panelClass || [])]
    });
  }

  closeAll(): void {
    this.dialog.closeAll();
  }
}
