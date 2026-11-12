import {Component, computed, DestroyRef, inject, input, OnInit, SecurityContext, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {DomSanitizer} from '@angular/platform-browser';
import {map, startWith} from 'rxjs/operators';
import {
  ButtonComponent,
  CardComponent,
  CardContentComponent,
  DialogService,
  FormFieldComponent,
  InputDirective,
  LabelComponent,
  OptionComponent,
  RichTextEditorComponent,
  SelectComponent,
} from '../../../../../ui-components';
import {PromiseButtonDirective} from '../../../../shared/directives/PromiseButton';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {CommunicationsService} from '../../communications.service';
import {CHANNEL_ADAPTERS, CommunicationChannel, CommunicationRecipient} from '../../communications.types';
import {CommunicationsTranslationPipe} from '../../i18n/communications.translation';
import {
  PreviewCustomersDialogComponent,
  PreviewCustomersDialogData,
} from '../preview-customers-dialog/preview-customers-dialog.component';
import {QuickRecipientComponent} from '../quick-recipient/quick-recipient.component';

/** The quick send's tabs: the kinds of delivery it sends by */
export type QuickSendKind = 'email' | 'push';

/** The push channel: its run ends with "Push notification has been sent." */
const PUSH_CHANNEL = 'communication-channel-push-notifications';
/** How often the progress of a send is read, and how long the bar stays once it ends (SENDDONE) */
const PROGRESS_INTERVAL_MS = 2500;

/**
 * One tab of the quick send (QuickSend): the channel of the tab's kind, the recipient, Preview customers, and the
 * subject, content and Send with the progress bar of a running send
 */
@Component({
  selector: 'app-quick-send-panel',
  templateUrl: './quick-send-panel.component.html',
  styleUrl: './quick-send-panel.component.scss',
  imports: [
    ReactiveFormsModule,
    CardComponent,
    CardContentComponent,
    FormFieldComponent,
    LabelComponent,
    InputDirective,
    SelectComponent,
    OptionComponent,
    RichTextEditorComponent,
    ButtonComponent,
    PromiseButtonDirective,
    QuickRecipientComponent,
    CommunicationsTranslationPipe,
  ],
  providers: [CommunicationsTranslationPipe],
})
export class QuickSendPanelComponent implements OnInit {
  private readonly communications = inject(CommunicationsService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly dialog = inject(DialogService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly i18n = inject(CommunicationsTranslationPipe);

  readonly kind = input.required<QuickSendKind>();

  // Channel (SENDCHANNEL)
  private readonly channels = signal<CommunicationChannel[]>([]);
  protected readonly channelOptions = computed(() => this.channels().map(channel => ({
    value: channel.key,
    label: (this.i18n.transform(channel.name) ?? '').replace('@', ''),
  })));
  protected readonly channel = signal<CommunicationChannel | null>(null);
  protected readonly channelKey = computed(() => this.channel()?.key ?? null);
  protected readonly channelKind = computed(() => this.channel()?.adapter ?? null);

  // Recipient and preview (SENDRECIPIENT, PREVIEW)
  private readonly recipient = signal<CommunicationRecipient | null>(null);
  private readonly previewIds = signal<string[]>([]);
  protected readonly previewCount = computed(() => this.previewIds().length);
  protected readonly previewPromise = signal<Promise<void> | null>(null);
  /** Counts the previews, so a slower older answer can't replace a newer one */
  private previewRequest = 0;

  // Message and send (SENDFORM, SENDDONE)
  protected readonly form = new FormGroup({
    subject: new FormControl('', {nonNullable: true, validators: Validators.required}),
    content: new FormControl('', {nonNullable: true, validators: Validators.required}),
  });
  private readonly formValid = toSignal(
    this.form.statusChanges.pipe(startWith(this.form.status), map(status => status === 'VALID')),
    {initialValue: false},
  );
  protected readonly running = signal(false);
  protected readonly progress = signal(0);
  protected readonly sendDisabled = computed(() => !this.formValid() || !this.recipient() || this.running());
  protected readonly sendPromise = signal<Promise<void> | null>(null);
  private watch?: ReturnType<typeof setInterval>;
  private hideTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      clearInterval(this.watch);
      clearTimeout(this.hideTimer);
    });
  }

  async ngOnInit(): Promise<void> {
    const channels = await this.communications.searchChannel('', CHANNEL_ADAPTERS[this.kind()]);
    this.channels.set(channels || []);
    // The only channel is chosen without a click
    if (this.channels().length === 1) this.channel.set(this.channels()[0]);
  }

  protected chooseChannel(key: string | null): void {
    this.channel.set(this.channels().find(channel => channel.key === key) ?? null);
  }

  protected recipientChanged(recipient: CommunicationRecipient | null): void {
    if (!recipient) {
      this.resetPreview();
      return;
    }
    this.recipient.set(recipient);
    this.previewPromise.set(this.prerender(recipient));
  }

  protected openPreview(): void {
    this.dialog.open<PreviewCustomersDialogComponent, PreviewCustomersDialogData>(PreviewCustomersDialogComponent, {
      data: {customerIds: this.previewIds()},
      width: '800px',
    });
  }

  protected send(): void {
    const channel = this.channel();
    const recipient = this.recipient();
    // Nothing is sent without a channel
    if (!channel?.key || !recipient) return;
    this.sendPromise.set(this.run(channel.key, recipient));
  }

  /** The customers the recipient reaches, each e-mail address once */
  private async prerender(recipient: CommunicationRecipient): Promise<void> {
    this.resetPreview();
    const request = ++this.previewRequest;
    const result = await this.communications.prerenderRecipients(recipient.ref, recipient.params ?? '');
    if (request !== this.previewRequest || !result?.success) return;
    this.previewIds.set(result.payload ?? []);
  }

  private resetPreview(): void {
    this.previewRequest++;
    this.previewIds.set([]);
  }

  /** Starts the send and follows its run; a send the backend refuses shows nothing */
  private async run(channelKey: string, recipient: CommunicationRecipient): Promise<void> {
    const {subject, content} = this.form.getRawValue();
    // The old quick send's editor gave its text through Angular's HTML sanitizer, which takes inline styles out
    const template = this.sanitizer.sanitize(SecurityContext.HTML, content) ?? '';
    const started = await this.communications.send([recipient], subject, template, channelKey);
    if (!started?.success || !started.queue) return;
    const queueId = started.queue;
    clearInterval(this.watch);
    clearTimeout(this.hideTimer);
    this.running.set(true);
    this.progress.set(0);
    this.watch = setInterval(async () => {
      const queue = await this.communications.getQueue(queueId);
      if (!queue || !this.watch) return;
      if (queue.progress) this.progress.set(queue.progress);
      if (queue.done || queue.failed || queue.progress === 100) {
        clearInterval(this.watch);
        this.watch = undefined;
        this.juicebox.showToast('success', this.i18n.transform(channelKey === PUSH_CHANNEL ? 'push_sent' : 'email_sent'));
        this.hideTimer = setTimeout(() => this.running.set(false), PROGRESS_INTERVAL_MS);
      }
    }, PROGRESS_INTERVAL_MS);
  }
}
