import {Component, inject, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {DialogRef} from '@angular/cdk/dialog';
import {
  ButtonComponent,
  DialogActionsComponent,
  DialogContentComponent,
  DialogTitleComponent,
  JsonEditorComponent,
} from '../../../../ui-components';
import {PromiseButtonDirective} from '../../../shared/directives/PromiseButton';
import {ConfigurationService} from '../../../shared/services/configuration.service';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {ConfigurationsTranslationPipe} from '../i18n/configurations.translation';

/**
 * Adds a configuration written as JSON. Closes with `true` once the backend stored it; the × closes it without
 * creating. Either way the listing reads again.
 */
@Component({
  selector: 'app-configurations-create-dialog',
  templateUrl: './configurations-create-dialog.component.html',
  styleUrl: './configurations-create-dialog.component.scss',
  imports: [
    ReactiveFormsModule,
    DialogTitleComponent,
    DialogContentComponent,
    DialogActionsComponent,
    JsonEditorComponent,
    ButtonComponent,
    PromiseButtonDirective,
    ConfigurationsTranslationPipe,
  ],
  providers: [ConfigurationsTranslationPipe],
})
export class ConfigurationsCreateDialogComponent {
  private readonly configurations = inject(ConfigurationService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);
  private readonly i18n = inject(ConfigurationsTranslationPipe);

  /** `required` refuses an empty value (null, "" or []); the editor adds `invalidJson` while the text is not JSON */
  protected readonly form = new FormGroup({
    configuration: new FormControl<unknown>({key: null, name: null}, Validators.required),
  });
  protected readonly createPromise = signal<Promise<void> | null>(null);

  protected create(): void {
    this.createPromise.set(this.save());
  }

  private async save(): Promise<void> {
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
    const result = await this.configurations.install(this.form.getRawValue().configuration);
    // No answer at all: the gateway has already said what went wrong
    if (!result) return;
    if (!result.success) {
      this.juicebox.showToast('error', result.error);
      return;
    }
    this.juicebox.showToast('success', this.i18n.transform('configuration_created'));
    this.dialogRef.close(true);
  }
}
