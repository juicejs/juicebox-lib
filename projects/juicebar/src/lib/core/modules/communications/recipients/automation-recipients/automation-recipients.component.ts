import {Component, computed, DestroyRef, effect, inject, input, signal, untracked} from '@angular/core';
import {
  ButtonComponent,
  CellDefDirective,
  ColumnConfig,
  DataTableComponent,
  DialogService,
  IconComponent,
  TooltipDirective,
} from '../../../../../ui-components';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogData,
} from '../../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import {CommunicationsService} from '../../communications.service';
import {Communication, CommunicationRecipient} from '../../communications.types';
import {CommunicationsTranslationPipe} from '../../i18n/communications.translation';
import {RecipientDialogComponent, RecipientDialogData} from '../recipient-dialog/recipient-dialog.component';

/** How often the progress of a run is read, and how long the bar stays once it ends (SENDNOW) */
const PROGRESS_INTERVAL_MS = 2000;

/**
 * The right half of an opened automation (AutomationRecipients): its recipients with their provider's key and
 * parameters (RECLIST), Add recipient, and Send with the progress bar of the run it starts (SENDNOW).
 */
@Component({
  selector: 'app-automation-recipients',
  templateUrl: './automation-recipients.component.html',
  styleUrl: './automation-recipients.component.scss',
  imports: [DataTableComponent, CellDefDirective, ButtonComponent, IconComponent, TooltipDirective, CommunicationsTranslationPipe],
  providers: [CommunicationsTranslationPipe],
})
export class AutomationRecipientsComponent {
  private readonly communications = inject(CommunicationsService);
  private readonly dialog = inject(DialogService);
  private readonly i18n = inject(CommunicationsTranslationPipe);

  readonly communicationId = input.required<string>();

  private readonly communication = signal<Communication | null>(null);
  protected readonly rows = computed<CommunicationRecipient[]>(() => this.communication()?.recipients ?? []);
  protected readonly pageSize = computed(() => Math.max(1, this.rows().length));
  protected readonly pageSizeOptions: number[] = [];
  protected readonly columns: ColumnConfig[] = [
    {key: 'ref', label: this.i18n.transform('recipients_provider')},
    {key: 'params', label: this.i18n.transform('recipients_params')},
    {key: 'actions', label: this.i18n.transform('actions'), width: '112px', align: 'right', ellipsis: false},
  ];

  /** The run Send started, until 2 seconds after it ends */
  protected readonly running = signal(false);
  protected readonly progress = signal(0);
  private watch?: ReturnType<typeof setInterval>;
  private hideTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    // Another automation opened in its place: its recipients, and no run of the one before
    effect(() => {
      const communicationId = this.communicationId();
      untracked(() => {
        this.stopWatching();
        void this.load(communicationId);
      });
    });
    inject(DestroyRef).onDestroy(() => this.stopWatching());
  }

  protected add(): void {
    this.openDialog({communicationId: this.communicationId()});
  }

  protected change(recipient: CommunicationRecipient): void {
    this.openDialog({communicationId: this.communicationId(), recipient});
  }

  /** Asks nothing; every recipient with the same provider and parameters goes (the backend's way) */
  protected async remove(recipient: CommunicationRecipient): Promise<void> {
    const communicationId = this.communicationId();
    const result = await this.communications.deleteRecipient(communicationId, recipient);
    if (result?.success) await this.load(communicationId);
  }

  /** Runs the automation once the staff member confirms; cancelling reads the recipients again */
  protected send(): void {
    const data: ConfirmationDialogData = {
      subject: this.i18n.transform('communication'),
      action: this.i18n.transform('send'),
    };
    this.dialog
      .open<ConfirmationDialogComponent, ConfirmationDialogData, boolean>(ConfirmationDialogComponent, {data})
      .closed.subscribe(confirmed => {
        if (confirmed) void this.run(this.communicationId());
        else void this.load(this.communicationId());
      });
  }

  private async run(communicationId: string): Promise<void> {
    const started = await this.communications.sendCommunication(communicationId);
    if (!started?.success || !started.queue || communicationId !== this.communicationId()) return;
    const queueId = started.queue;
    this.stopWatching();
    this.running.set(true);
    this.progress.set(1);
    this.watch = setInterval(async () => {
      const queue = await this.communications.getQueue(queueId);
      if (!queue || !this.watch) return;
      if (queue.progress) this.progress.set(queue.progress);
      if (queue.done || queue.failed || queue.progress === 100) {
        clearInterval(this.watch);
        this.watch = undefined;
        this.hideTimer = setTimeout(() => this.running.set(false), PROGRESS_INTERVAL_MS);
      }
    }, PROGRESS_INTERVAL_MS);
  }

  private stopWatching(): void {
    clearInterval(this.watch);
    clearTimeout(this.hideTimer);
    this.watch = undefined;
    this.running.set(false);
  }

  private openDialog(data: RecipientDialogData): void {
    this.dialog
      .open<RecipientDialogComponent, RecipientDialogData, boolean>(RecipientDialogComponent, {
        data,
        width: '560px',
        disableClose: true,
      })
      .closed.subscribe(stored => {
        if (stored) void this.load(data.communicationId);
      });
  }

  private async load(communicationId: string): Promise<void> {
    const communication = await this.communications.getCommunication(communicationId);
    if (communicationId === this.communicationId()) this.communication.set(communication);
  }
}
