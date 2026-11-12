import {Component, inject, OnInit, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {DialogRef} from '@angular/cdk/dialog';
import {
  ButtonComponent,
  DialogActionsComponent,
  DialogContentComponent,
  DialogTitleComponent,
  ErrorComponent,
  FormFieldComponent,
  InputDirective,
  LabelComponent,
  OptionComponent,
  SelectComponent,
} from '../../../../../ui-components';
import {PromiseButtonDirective} from '../../../../shared/directives/PromiseButton';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {CommunicationsService} from '../../communications.service';
import {CommunicationChannel, CommunicationEvent} from '../../communications.types';
import {CommunicationsTranslationPipe} from '../../i18n/communications.translation';

/**
 * "Create communication" (CreateAutomationDialog): a name, an event and a channel. It closes only with its close
 * button or Create, and closes with `true` after Create, also when the backend answered nothing and the error notice
 * shows (AUTONEW).
 */
@Component({
  selector: 'app-automation-create-dialog',
  templateUrl: './automation-create-dialog.component.html',
  imports: [
    ReactiveFormsModule,
    DialogTitleComponent,
    DialogContentComponent,
    DialogActionsComponent,
    FormFieldComponent,
    LabelComponent,
    ErrorComponent,
    InputDirective,
    SelectComponent,
    OptionComponent,
    ButtonComponent,
    PromiseButtonDirective,
    CommunicationsTranslationPipe,
  ],
  providers: [CommunicationsTranslationPipe],
})
export class AutomationCreateDialogComponent implements OnInit {
  private readonly communications = inject(CommunicationsService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);
  private readonly i18n = inject(CommunicationsTranslationPipe);

  protected readonly form = new FormGroup({
    name: new FormControl('', {nonNullable: true, validators: Validators.required}),
    // '' until an event is chosen, null once one is cleared: what the old dialog sent
    event: new FormControl<string | null>(''),
    channel: new FormControl<string | null>(null, Validators.required),
  });
  /** Every event and every channel (EVENTS, CHANNELS) */
  protected readonly events = signal<CommunicationEvent[]>([]);
  protected readonly channels = signal<CommunicationChannel[]>([]);
  protected readonly createPromise = signal<Promise<void> | null>(null);

  async ngOnInit(): Promise<void> {
    const [events, channels] = await Promise.all([
      this.communications.searchEvents(''),
      this.communications.searchChannel(''),
    ]);
    this.events.set(events ?? []);
    this.channels.set(channels ?? []);
  }

  protected create(): void {
    this.createPromise.set(this.save());
  }

  private async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const {name, event, channel} = this.form.getRawValue();
    const id = await this.communications.createCommunication({name, event, channel: channel ?? ''});
    if (!id) this.juicebox.showToast('error', this.i18n.transform('create_communication_error'));
    this.dialogRef.close(true);
  }
}
