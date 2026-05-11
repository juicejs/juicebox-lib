import { Injectable, inject } from '@angular/core';
import { CanDeactivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { FormGroup } from '@angular/forms';
import { DialogService } from '../../../ui-components';
import { ConfirmationDialogComponent } from '../components/confirmation-dialog/confirmation-dialog.component';
import { JuiceboxService } from '../services/Juicebox.service';
import { SharedTranslationPipe } from '../i18n/shared-translation.pipe';

export interface CanComponentDeactivate {
  canDeactivate: () => Promise<boolean> | boolean;
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

    const forms = Object.values(component).filter(item => item instanceof FormGroup);
    if (!forms.length) return true;

    const dirtyForms = forms.filter((form: FormGroup) => form.dirty);
    if (!dirtyForms.length) return true;

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
}
