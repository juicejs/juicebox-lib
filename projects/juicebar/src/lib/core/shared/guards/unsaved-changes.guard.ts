import { Injectable, inject, isSignal } from '@angular/core';
import { CanDeactivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { FormGroup } from '@angular/forms';
import { DialogService } from '../../../ui-components';
import { ConfirmationDialogComponent } from '../components/confirmation-dialog/confirmation-dialog.component';
import { JuiceboxService } from '../services/Juicebox.service';
import { SharedTranslationPipe } from '../i18n/shared-translation.pipe';

export interface CanComponentDeactivate {
  canDeactivate?: () => Promise<boolean> | boolean;
  /** For unsaved state that is not a FormGroup, e.g. a signal-based editor. */
  hasUnsavedChanges?: () => boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UnsavedChangesGuard implements CanDeactivate<CanComponentDeactivate> {
  private dialog = inject(DialogService);
  private juicebox = inject(JuiceboxService);
  private i18n = new SharedTranslationPipe(this.juicebox);

  async canDeactivate(
    component: CanComponentDeactivate,
    currentRoute: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState?: RouterStateSnapshot
  ): Promise<boolean> {
    const unsavedChangesGuard = this.juicebox.getOptions().unsaved_changes_guard;
    if (unsavedChangesGuard === false) return true;

    if (component.canDeactivate) return component.canDeactivate();

    const hasUnsavedChanges = component.hasUnsavedChanges
      ? component.hasUnsavedChanges()
      : this.hasDirtyForm(component);
    if (!hasUnsavedChanges) return true;

    const dialogRef = this.dialog.open<ConfirmationDialogComponent, any, boolean>(ConfirmationDialogComponent, {
      disableClose: true,
      data: {
        action: this.i18n.transform('continue_without_saving_changes'),
        completeMessage: this.i18n.transform('are_you_sure_you_want_to_continue_withouth_saving_changes')
      }
    });

    return new Promise<boolean>(resolve => {
      dialogRef.closed.subscribe(result => resolve(result === true));
    });
  }

  /** Finds dirty FormGroups on the component, including ones held in signals. */
  private hasDirtyForm(component: object): boolean {
    return Object.values(component)
      .map(value => (isSignal(value) ? this.readSignal(value) : value))
      .some(value => value instanceof FormGroup && value.dirty);
  }

  private readSignal(value: () => unknown): unknown {
    try {
      return value();
    } catch {
      // e.g. a required input() that has not been set
      return null;
    }
  }
}
