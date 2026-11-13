import {Component, inject, OnInit, signal} from '@angular/core';
import {JsonPipe} from '@angular/common';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {DIALOG_DATA, DialogRef} from '@angular/cdk/dialog';
import {
  ButtonComponent,
  DialogActionsComponent,
  DialogContentComponent,
  DialogTitleComponent,
  IconComponent,
  JsonEditorComponent,
} from '../../../../ui-components';
import {PromiseButtonDirective} from '../../../shared/directives/PromiseButton';
import {ConfigurationService} from '../../../shared/services/configuration.service';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {ComparedConfiguration} from '../../../shared/types/ComparedConfiguration';
import {ConfigurationsTranslationPipe} from '../i18n/configurations.translation';

export interface ConfigurationsEditDialogData {
  configurationKey: string | null;
}

/** Which copy is in the editor: also its label's key */
type Copy = 'memory' | 'database';

/**
 * Changes a configuration: compares its memory and database copies, and saves the copy applied, as edited in the JSON
 * editor. Equal copies start with the memory copy applied; unequal ones show both and wait for a copy to be applied
 * before Save. Closes with `true` once saved; Cancel and the × close it without saving.
 */
@Component({
  selector: 'app-configurations-edit-dialog',
  templateUrl: './configurations-edit-dialog.component.html',
  styleUrl: './configurations-edit-dialog.component.scss',
  imports: [
    JsonPipe,
    ReactiveFormsModule,
    DialogTitleComponent,
    DialogContentComponent,
    DialogActionsComponent,
    JsonEditorComponent,
    ButtonComponent,
    IconComponent,
    PromiseButtonDirective,
    ConfigurationsTranslationPipe,
  ],
  providers: [ConfigurationsTranslationPipe],
})
export class ConfigurationsEditDialogComponent implements OnInit {
  private readonly configurations = inject(ConfigurationService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);
  private readonly data = inject<ConfigurationsEditDialogData>(DIALOG_DATA);
  private readonly i18n = inject(ConfigurationsTranslationPipe);

  protected readonly compared = signal<ComparedConfiguration | null>(null);
  protected readonly applied = signal<Copy | null>(null);
  protected readonly showDifferences = signal(false);
  /** `required` refuses an empty value (null, "" or []); the editor adds `invalidJson` while the text is not JSON */
  protected readonly form = new FormGroup({
    configuration: new FormControl<unknown>(null, Validators.required),
  });
  protected readonly savePromise = signal<Promise<void> | null>(null);

  async ngOnInit(): Promise<void> {
    const result = await this.configurations.compare(this.data.configurationKey);
    if (!result?.success) {
      // Without the comparison there is nothing to change. No answer at all: the gateway has already said why.
      if (result) this.juicebox.showToast('error', result.error);
      this.dialogRef.close();
      return;
    }
    this.compared.set(result.payload);
    // Equal copies: either will do
    if (result.payload.comparison.equal) this.apply('memory');
  }

  protected apply(copy: Copy): void {
    this.applied.set(copy);
    this.form.setValue({configuration: this.compared()?.configurations[copy] ?? null});
  }

  protected toggleDifferences(): void {
    this.showDifferences.update(shown => !shown);
  }

  protected save(): void {
    this.savePromise.set(this.store());
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  private async store(): Promise<void> {
    // As the old juicebox: an empty value first, then text that is not JSON (the editor's `invalidJson`)
    const control = this.form.controls.configuration;
    if (control.hasError('required')) {
      this.juicebox.showToast('error', this.i18n.transform('configuration_must_have_properties_set'));
      return;
    }
    if (control.hasError('invalidJson')) {
      this.juicebox.showToast('error', this.i18n.transform('invalid_json'));
      return;
    }
    const result = await this.configurations.update(this.form.getRawValue().configuration);
    // No answer at all: the gateway has already said what went wrong
    if (!result) return;
    if (!result.success) {
      this.juicebox.showToast('error', result.error);
      return;
    }
    // The backend's own words when it created the key anew ("New configuration created")
    this.juicebox.showToast('success', result.payload?.message || this.i18n.transform('edited'));
    this.dialogRef.close(true);
  }
}
