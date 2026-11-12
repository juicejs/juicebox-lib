import {Component, effect, inject, input, output, signal, untracked} from '@angular/core';
import {FormFieldComponent, LabelComponent, OptionComponent, SelectComponent} from '../../../../../ui-components';
import {CommunicationsService} from '../../communications.service';
import {CommunicationRecipient, SelectionType} from '../../communications.types';
import {CommunicationsTranslationPipe} from '../../i18n/communications.translation';
import {ChoiceOption, SELECTION_TYPES} from '../../recipients/recipients.types';
import {SelectionTypeFormComponent} from '../../recipients/selection-types/selection-type-form.component';

/**
 * The quick send's recipient (SENDRECIPIENT): a provider that delivers through the channel's kind, a selection type
 * it takes and that type's form. Each change of the parameters gives the recipient anew; choosing another provider
 * gives `null`, which empties the preview and keeps the recipient made before.
 */
@Component({
  selector: 'app-quick-recipient',
  templateUrl: './quick-recipient.component.html',
  imports: [FormFieldComponent, LabelComponent, SelectComponent, OptionComponent, SelectionTypeFormComponent, CommunicationsTranslationPipe],
  providers: [CommunicationsTranslationPipe],
})
export class QuickRecipientComponent {
  private readonly communications = inject(CommunicationsService);
  private readonly i18n = inject(CommunicationsTranslationPipe);

  /** The kind of delivery of the chosen channel (its `adapter`); none before a channel is chosen */
  readonly channelKind = input<string | null>(null);
  readonly recipientChange = output<CommunicationRecipient | null>();

  protected readonly providers = signal<ChoiceOption[]>([]);
  protected readonly provider = signal<string | null>(null);
  protected readonly types = signal<ChoiceOption[]>([]);
  protected readonly selectionType = signal<SelectionType | null>(null);
  /** A new value makes the type's form anew */
  protected readonly formGeneration = signal([0]);
  /** Counts the provider choices, so a slower older answer can't replace a newer one */
  private request = 0;

  constructor() {
    effect(() => {
      const kind = this.channelKind();
      untracked(() => void this.loadProviders(kind));
    });
  }

  protected async chooseProvider(key: string | null): Promise<void> {
    if (!key) return;
    const request = ++this.request;
    this.provider.set(key);
    this.selectionType.set(null);
    const result = await this.communications.getReceiverSupportedSelectionTypes(key);
    if (request !== this.request) return;
    const supported: readonly string[] = result?.success && result.payload ? result.payload : [];
    const types = SELECTION_TYPES.filter(type => supported.includes(type));
    this.types.set(types.map(type => ({value: type, label: this.i18n.transform(type)})));
    // The first type the provider names, in its own order, other than Event parameters; or else the first offered
    const named = supported.find(type => type !== 'event_params') as SelectionType | undefined;
    this.selectionType.set(types.length ? named ?? types[0] : null);
    this.formGeneration.update(([generation]) => [generation + 1]);
    this.recipientChange.emit(null);
  }

  protected chooseType(type: SelectionType | null): void {
    if (!type) return;
    this.selectionType.set(type);
    this.formGeneration.update(([generation]) => [generation + 1]);
  }

  protected paramsChanged(params: string): void {
    const ref = this.provider();
    if (ref) this.recipientChange.emit({ref, params});
  }

  private async loadProviders(kind: string | null): Promise<void> {
    if (!kind) {
      this.providers.set([]);
      return;
    }
    const providers = await this.communications.searchRecipients({channel: kind});
    if (kind !== this.channelKind()) return;
    this.providers.set((providers || []).map(provider => ({
      value: provider.key,
      label: (this.i18n.transform(provider.name) ?? '').replace('@', ''),
    })));
  }
}
