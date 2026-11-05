import { Injectable, inject, Type } from '@angular/core';
import { Dialog, DialogConfig, DialogRef } from '@angular/cdk/dialog';
import { hasModifierKey } from '@angular/cdk/keycodes';

export { DialogRef, DialogConfig } from '@angular/cdk/dialog';
export { DIALOG_DATA } from '@angular/cdk/dialog';

export interface AppDialogConfig<D = any, R = any> extends DialogConfig<D, DialogRef<R>> {
  /**
   * With `disableClose`, a backdrop click doesn't close the dialog but Esc still does (with no result), as NgbModal's
   * `backdrop: 'static'` did in the old juicebox. `false` blocks Esc too, like NgbModal's `keyboard: false`.
   */
  closeOnEscape?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  private dialog = inject(Dialog);

  open<T, D = any, R = any>(
    component: Type<T>,
    config?: AppDialogConfig<D, R>
  ): DialogRef<R> {
    const { closeOnEscape = true, ...dialogConfig } = config ?? {};
    // `panelClass` may be one class or a list
    const panelClass = dialogConfig.panelClass;
    const dialogRef = this.dialog.open<R, D, T>(component, {
      ...dialogConfig,
      panelClass: ['app-dialog-panel', ...(Array.isArray(panelClass) ? panelClass : panelClass ? [panelClass] : [])]
    });

    if (dialogConfig.disableClose && closeOnEscape) {
      dialogRef.keydownEvents.subscribe(event => {
        if (event.key === 'Escape' && !hasModifierKey(event)) dialogRef.close();
      });
    }
    return dialogRef;
  }

  closeAll(): void {
    this.dialog.closeAll();
  }
}
