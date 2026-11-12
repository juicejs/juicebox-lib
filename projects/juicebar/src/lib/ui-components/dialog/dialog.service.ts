import { Injectable, inject, Type } from '@angular/core';
import { Dialog, DialogConfig, DialogRef } from '@angular/cdk/dialog';
import { hasModifierKey } from '@angular/cdk/keycodes';

export { DialogRef, DialogConfig } from '@angular/cdk/dialog';
export { DIALOG_DATA } from '@angular/cdk/dialog';

/**
 * The panel class of a dialog that stays a card on a phone. A dialog's component can ask for it itself:
 * `dialogRef.addPanelClass(DIALOG_CARD_CLASS)`, as the confirmation dialog does.
 */
export const DIALOG_CARD_CLASS = 'app-dialog-panel--card';

export interface AppDialogConfig<D = any, R = any> extends DialogConfig<D, DialogRef<R>> {
  /**
   * With `disableClose`, a backdrop click doesn't close the dialog but Esc still does (with no result), as NgbModal's
   * `backdrop: 'static'` did in the old juicebox. `false` blocks Esc too, like NgbModal's `keyboard: false`.
   */
  closeOnEscape?: boolean;
  /**
   * On a phone (600px and below) a dialog takes the whole screen, with its buttons at the bottom. `'card'` keeps a
   * small one, a question or a notice, as a card over the page.
   */
  phone?: 'screen' | 'card';
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
    const { closeOnEscape = true, phone, ...dialogConfig } = config ?? {};
    // `panelClass` may be one class or a list
    const panelClass = dialogConfig.panelClass;
    const dialogRef = this.dialog.open<R, D, T>(component, {
      ...dialogConfig,
      panelClass: [
        'app-dialog-panel',
        ...(phone === 'card' ? [DIALOG_CARD_CLASS] : []),
        ...(Array.isArray(panelClass) ? panelClass : panelClass ? [panelClass] : []),
      ]
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
