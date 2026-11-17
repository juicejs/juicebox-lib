import {Component, inject, signal} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {DialogRef} from '@angular/cdk/dialog';
import {
  ButtonComponent,
  DIALOG_DATA,
  DialogActionsComponent,
  DialogContentComponent,
  DialogTitleComponent,
  FormFieldComponent,
  InputDirective,
  LabelComponent,
} from '../../../../ui-components';
import {PromiseButtonDirective} from '../../../shared/directives/PromiseButton';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {EntitiesService} from '../entities.service';
import {EntityGroup} from '../entities.types';
import {EntitiesTranslationPipe} from '../i18n/entities.translation';

/** Renames a customer group; closes with `true` once it is stored. The name in the list changes only then. */
@Component({
  selector: 'app-rename-group-dialog',
  templateUrl: './rename-group-dialog.component.html',
  imports: [
    ReactiveFormsModule,
    DialogTitleComponent,
    DialogContentComponent,
    DialogActionsComponent,
    FormFieldComponent,
    LabelComponent,
    InputDirective,
    ButtonComponent,
    PromiseButtonDirective,
    EntitiesTranslationPipe,
  ],
  providers: [EntitiesTranslationPipe],
})
export class RenameGroupDialogComponent {
  private readonly entities = inject(EntitiesService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);
  private readonly group = inject<EntityGroup>(DIALOG_DATA);
  private readonly i18n = inject(EntitiesTranslationPipe);

  protected readonly name = new FormControl(this.group.name, {nonNullable: true});
  protected readonly savePromise = signal<Promise<void> | null>(null);

  protected save(): void {
    this.savePromise.set(this.update());
  }

  private async update(): Promise<void> {
    const result = await this.entities.updateEntityGroup(this.group._id, this.name.value);
    if (!result?.success) {
      this.juicebox.showToast('error', this.i18n.transform('error'), result?.error);
      return;
    }
    this.dialogRef.close(true);
  }
}
