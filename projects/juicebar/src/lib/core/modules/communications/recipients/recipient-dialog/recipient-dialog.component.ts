import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {DIALOG_DATA, DialogRef} from '@angular/cdk/dialog';
import {
  ButtonComponent,
  DialogActionsComponent,
  DialogContentComponent,
  DialogTitleComponent,
  DividerComponent,
  FormFieldComponent,
  LabelComponent,
  OptionComponent,
  SelectComponent,
} from '../../../../../ui-components';
import {PromiseButtonDirective} from '../../../../shared/directives/PromiseButton';
import {CommunicationsService} from '../../communications.service';
import {CommunicationRecipient, RecipientParameter, RecipientProviderMeta, SelectionType} from '../../communications.types';
import {CommunicationsTranslationPipe} from '../../i18n/communications.translation';
import {ChoiceOption, Customer, RECIPIENT_PARAMETERS, SELECTION_TYPES} from '../recipients.types';
import {SelectionTypeFormComponent} from '../selection-types/selection-type-form.component';

export interface RecipientDialogData {
  communicationId: string;
  /** The recipient to change; none to add one */
  recipient?: CommunicationRecipient;
}

/** The providers the dialog doesn't offer */
const HIDDEN_PROVIDERS = ['customer-email-recipients-provider', 'customer-push-recipients-provider'];
/** This provider fixes Parameter to E-mail and Type of parameters to Filter by attribute */
const EMAIL_ATTRIBUTE_PROVIDER = 'attribute-recipients-provider-email';

/** The recipient's own parameters and kept customers, shown until its provider or type is changed */
interface RecipientPreset {
  params: string;
  keptCustomers: Customer[];
}

/**
 * The recipient dialog of an automation (RecipientDialog): adds a recipient (RECDIALOG) or changes one (RECEDIT),
 * and closes with `true` once it is stored.
 */
@Component({
  selector: 'app-recipient-dialog',
  templateUrl: './recipient-dialog.component.html',
  styleUrl: './recipient-dialog.component.scss',
  imports: [
    DialogTitleComponent,
    DialogContentComponent,
    DialogActionsComponent,
    DividerComponent,
    FormFieldComponent,
    LabelComponent,
    SelectComponent,
    OptionComponent,
    ButtonComponent,
    PromiseButtonDirective,
    SelectionTypeFormComponent,
    CommunicationsTranslationPipe,
  ],
  providers: [CommunicationsTranslationPipe],
})
export class RecipientDialogComponent implements OnInit {
  private readonly communications = inject(CommunicationsService);
  private readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);
  private readonly i18n = inject(CommunicationsTranslationPipe);
  private readonly data = inject<RecipientDialogData>(DIALOG_DATA);

  protected readonly editing = !!this.data.recipient;
  protected readonly providers = signal<RecipientProviderMeta[]>([]);
  protected readonly provider = signal<string | null>(this.data.recipient?.ref ?? null);
  protected readonly parameter = signal<RecipientParameter>(this.data.recipient?.parameter ?? 'email');
  /**
   * Customer list at first. A recipient stored without a type (older ones are) shows none and no form, so Update
   * sends its parameters as they are
   */
  protected readonly inputType = signal<SelectionType | null>(
    this.data.recipient ? this.data.recipient.inputType ?? null : 'customer_list',
  );
  /** The provider fixes Parameter and Type of parameters */
  protected readonly fixed = signal(false);
  protected readonly parameterOptions: ChoiceOption[] = RECIPIENT_PARAMETERS.map(key => ({value: key, label: this.i18n.transform(key)}));
  protected readonly typeOptions: ChoiceOption[] = SELECTION_TYPES.map(key => ({value: key, label: this.i18n.transform(key)}));

  private readonly params = signal(this.data.recipient?.params ?? '');
  private readonly customerIds = signal<string[] | undefined>(undefined);
  protected readonly preset = signal<RecipientPreset | null>(null);
  /** The form of a changed recipient's form customers can't be changed */
  protected readonly formLocked = computed(() => this.preset() !== null);
  /** The type's form shows once a changed recipient's kept customers are read */
  protected readonly formReady = signal(false);
  /** A new value makes the type's form anew: choosing a provider or a type clears the parameters */
  protected readonly formGeneration = signal([0]);
  protected readonly savePromise = signal<Promise<void> | null>(null);

  async ngOnInit(): Promise<void> {
    void this.loadProviders();
    const recipient = this.data.recipient;
    if (recipient) {
      const keptCustomers = await this.loadKeptCustomers(recipient);
      this.preset.set({params: recipient.params ?? '', keptCustomers});
    }
    this.formReady.set(true);
  }

  protected chooseProvider(key: string | null): void {
    this.provider.set(key);
    const fixed = key === EMAIL_ATTRIBUTE_PROVIDER;
    this.fixed.set(fixed);
    if (fixed) {
      this.parameter.set('email');
      this.inputType.set('attributes_filter');
    }
    this.clearParams();
  }

  protected chooseParameter(parameter: RecipientParameter | null): void {
    if (parameter) this.parameter.set(parameter);
  }

  protected chooseType(type: SelectionType | null): void {
    if (!type) return;
    this.inputType.set(type);
    this.clearParams();
  }

  protected paramsChanged(params: string): void {
    this.params.set(params);
  }

  protected customerIdsChanged(ids: string[]): void {
    this.customerIds.set(ids);
  }

  protected cancel(): void {
    this.dialogRef.close(false);
  }

  /** Add or Update: the recipient is stored as it is, empty parameters too */
  protected save(): void {
    this.savePromise.set(this.store());
  }

  private async store(): Promise<void> {
    const recipient = {
      ref: this.provider() ?? undefined,
      params: this.params(),
      inputType: this.inputType() ?? undefined,
      parameter: this.parameter(),
      customerIDs: this.customerIds(),
      ...(this.editing && {_id: this.data.recipient?._id}),
    } as CommunicationRecipient;
    if (this.editing) await this.communications.updateRecipient(this.data.communicationId, recipient);
    else await this.communications.addRecipient(this.data.communicationId, recipient);
    this.dialogRef.close(true);
  }

  private clearParams(): void {
    this.params.set('');
    // The chosen customers go; the list itself stays in what is stored, empty, once a form gave one (as the old dialog sent it)
    this.customerIds.update(ids => ids && []);
    this.preset.set(null);
    this.formGeneration.update(([generation]) => [generation + 1]);
  }

  private async loadProviders(): Promise<void> {
    const providers = await this.communications.searchRecipients();
    this.providers.set((providers || []).filter(provider => !HIDDEN_PROVIDERS.includes(provider.key)));
  }

  /** A customer list's or form customers' kept customers, of the staff member's organisation */
  private async loadKeptCustomers(recipient: CommunicationRecipient): Promise<Customer[]> {
    if (!recipient._id || (recipient.inputType !== 'customer_list' && recipient.inputType !== 'form_customers')) return [];
    const result = await this.communications.fetchCustomerModels(this.data.communicationId, recipient._id);
    return (result?.entities ?? []) as Customer[];
  }
}
