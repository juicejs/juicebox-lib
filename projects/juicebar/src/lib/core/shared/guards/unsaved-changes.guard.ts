import { inject, isSignal } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
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

/** Asks before leaving a page with unsaved changes (options.unsaved_changes_guard: false turns it off) */
export const unsavedChangesGuard: CanDeactivateFn<CanComponentDeactivate> = async component => {
  const dialog = inject(DialogService);
  const juicebox = inject(JuiceboxService);

  const unsavedChangesGuardOption = juicebox.getOptions().unsaved_changes_guard;
  if (unsavedChangesGuardOption === false) return true;

  if (component.canDeactivate) return component.canDeactivate();

  const hasUnsavedChanges = component.hasUnsavedChanges
    ? component.hasUnsavedChanges()
    : hasDirtyForm(component);
  if (!hasUnsavedChanges) return true;

  const i18n = new SharedTranslationPipe(juicebox);
  const dialogRef = dialog.open<ConfirmationDialogComponent, any, boolean>(ConfirmationDialogComponent, {
    disableClose: true,
    data: {
      action: i18n.transform('continue_without_saving_changes'),
      completeMessage: i18n.transform('are_you_sure_you_want_to_continue_withouth_saving_changes')
    }
  });

  return new Promise<boolean>(resolve => {
    dialogRef.closed.subscribe(result => resolve(result === true));
  });
};

/** Finds dirty FormGroups on the component, including ones held in signals. */
function hasDirtyForm(component: object): boolean {
  return Object.values(component)
    .map(value => (isSignal(value) ? readSignal(value) : value))
    .some(value => value instanceof FormGroup && value.dirty);
}

function readSignal(value: () => unknown): unknown {
  try {
    return value();
  } catch {
    // e.g. a required input() that has not been set
    return null;
  }
}
