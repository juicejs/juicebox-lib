import {Component, computed, effect, inject, input, OnInit, output, signal, untracked} from '@angular/core';
import {FormFieldComponent, LabelComponent, OptionComponent, SelectComponent, SlideToggleComponent} from '../../../../../../ui-components';
import {RecipientParameter} from '../../../communications.types';
import {CommunicationsTranslationPipe} from '../../../i18n/communications.translation';
import {RecipientDirectoryService} from '../../recipient-directory.service';
import {
  ChoiceOption,
  Customer,
  customerAddress,
  customerLabel,
  CustomerForm,
  RecipientContext,
  remember,
  withChosen,
} from '../../recipients.types';

const PAGE_SIZE = 10;

/**
 * Form customers (FORMCUST): a form, then "Select all form customers", on at first, and a multiple choice of the
 * form's first 10 customers (searched by first name as typed in an automation), open only with the switch off.
 * Gives `<form id>` with the switch on, or `<form id>:` and each chosen customer's address: the e-mail address in the
 * quick send, the chosen parameter in an automation. Switching it on clears the chosen customers; removing the last
 * one switches it on.
 */
@Component({
  selector: 'app-form-customers-recipients',
  templateUrl: './form-customers.component.html',
  styleUrl: './form-customers.component.scss',
  imports: [FormFieldComponent, LabelComponent, SelectComponent, OptionComponent, SlideToggleComponent, CommunicationsTranslationPipe],
})
export class FormCustomersComponent implements OnInit {
  private readonly directory = inject(RecipientDirectoryService);

  readonly context = input<RecipientContext>('send');
  /** An automation's form: the address taken from each chosen customer */
  readonly parameter = input<RecipientParameter>('email');
  /** Changing a recipient: its form */
  readonly presetFormId = input<string | null>(null);
  /** Changing a recipient: its kept customers, chosen from the start */
  readonly keptCustomers = input<Customer[]>([]);
  /** The form can't be changed (a recipient being changed) */
  readonly formLocked = input(false);

  readonly paramsChange = output<string>();
  readonly customerIdsChange = output<string[]>();

  protected readonly automation = computed(() => this.context() === 'automation');

  private readonly forms = signal<CustomerForm[]>([]);
  private readonly chosenForm = signal<CustomerForm | null>(null);
  protected readonly formId = computed(() => this.chosenForm()?._id ?? null);
  protected readonly formOptions = computed<ChoiceOption[]>(() => {
    const chosen = this.chosenForm();
    const forms = this.forms();
    const all = chosen && !forms.some(form => form._id === chosen._id) ? [...forms, chosen] : forms;
    return all.map(form => ({value: form._id, label: form.name ?? ''}));
  });

  protected readonly sendToAll = signal(true);
  private readonly loaded = signal<Customer[]>([]);
  private readonly known = signal<ReadonlyMap<string, Customer>>(new Map());
  protected readonly chosenIds = signal<string[]>([]);
  protected readonly customerOptions = computed<ChoiceOption[]>(() => {
    const withEmail = !this.automation();
    return withChosen(this.loaded(), this.chosenIds(), this.known())
      .map(customer => ({value: customer._id, label: customerLabel(customer, withEmail)}));
  });
  protected readonly customersDisabled = computed(() => !this.formId() || this.sendToAll());

  /** The parameters; none until a form is chosen */
  private readonly params = computed<string | null>(() => {
    const formId = this.formId();
    if (!formId) return null;
    const known = this.known();
    const parameter: RecipientParameter = this.automation() ? this.parameter() : 'email';
    const addresses = this.chosenIds()
      .map(id => known.get(id))
      .map(customer => customer && customerAddress(customer, parameter))
      .filter(Boolean);
    if (addresses.length) return `${formId}:${addresses.join(',')}`;
    return this.sendToAll() ? formId : '';
  });

  /** Counts the requests, so a slower older answer can't replace a newer one */
  private formsRequest = 0;
  private customersRequest = 0;

  constructor() {
    effect(() => {
      const params = this.params();
      const ids = this.chosenIds();
      if (params === null) return;
      untracked(() => {
        this.paramsChange.emit(params);
        if (this.automation()) this.customerIdsChange.emit(ids);
      });
    });
  }

  async ngOnInit(): Promise<void> {
    const kept = this.keptCustomers();
    if (kept.length) {
      this.known.update(known => remember(known, kept));
      this.chosenIds.set(kept.map(customer => customer._id));
      this.sendToAll.set(false);
    }
    const presetFormId = this.presetFormId();
    if (presetFormId) {
      this.chosenForm.set({_id: presetFormId});
      void this.loadPresetForm(presetFormId);
      await this.loadCustomers('');
      return;
    }
    await this.loadForms('');
  }

  protected searchForms(term: string): void {
    void this.loadForms(term);
  }

  protected chooseForm(formId: string | null): void {
    if (!formId) return;
    this.chosenForm.set(this.forms().find(form => form._id === formId) ?? {_id: formId});
    void this.loadCustomers('');
  }

  protected toggleAll(on: boolean): void {
    this.sendToAll.set(on);
    if (on) this.chosenIds.set([]);
  }

  protected searchCustomers(term: string): void {
    if (this.automation()) void this.loadCustomers(term);
  }

  protected chooseCustomers(value: string[] | null): void {
    const ids = value ?? [];
    this.chosenIds.set(ids);
    if (!ids.length) this.sendToAll.set(true);
  }

  /** The first 10 forms, or the first 10 not archived whose name contains the text */
  private async loadForms(term: string): Promise<void> {
    const request = ++this.formsRequest;
    const result = term
      ? await this.directory.searchForms(term, 0, PAGE_SIZE)
      : await this.directory.fetchForms(0, PAGE_SIZE);
    if (request !== this.formsRequest || !result?.success || !result.payload?.forms) return;
    this.forms.set(result.payload.forms);
  }

  private async loadPresetForm(formId: string): Promise<void> {
    const result = await this.directory.getForm(formId);
    const form = result?.success ? result.payload?.form : null;
    if (!form) return;
    this.forms.set([form]);
    this.chosenForm.set(form);
  }

  private async loadCustomers(term: string): Promise<void> {
    const formId = this.formId();
    if (!formId) return;
    const request = ++this.customersRequest;
    // The quick send lists the first 10; an automation searches the first name
    const search: Record<string, string> = this.automation() ? {firstname: term} : {firstname: term, lastname: term, email: term};
    const result = await this.directory.fetchFormCustomers(0, PAGE_SIZE, formId, search);
    if (request !== this.customersRequest || !result?.success || !result.payload) return;
    const items = result.payload.entities ?? [];
    this.loaded.set(items);
    this.known.update(known => remember(known, items));
  }
}
