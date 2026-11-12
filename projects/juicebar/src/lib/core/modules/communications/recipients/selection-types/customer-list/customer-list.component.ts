import {Component, computed, effect, inject, input, OnInit, output, signal, untracked} from '@angular/core';
import {FormFieldComponent, LabelComponent, OptionComponent, SelectComponent} from '../../../../../../ui-components';
import {RecipientParameter} from '../../../communications.types';
import {CommunicationsTranslationPipe} from '../../../i18n/communications.translation';
import {CustomerQuery, RecipientDirectoryService} from '../../recipient-directory.service';
import {
  ChoiceOption,
  Customer,
  customerAddress,
  customerLabel,
  EntityTerm,
  RecipientContext,
  remember,
  withChosen,
} from '../../recipients.types';

/** The customers with an app token and the `mobile_user` attribute (FIREBASE) */
const FIREBASE_FILTER: EntityTerm[] = [
  {property: 'attributes.firebase', term: {$exists: true, $ne: ''}},
  {property: 'attributes.mobile_user', term: {$exists: true}},
];

/**
 * Customer list and Firebase Customer list (CUSTOMERLIST, FIREBASE): a multiple choice of customers, searched as
 * typed. The quick send's list, also the Firebase list in both places, shows 25 searched by name and e-mail and gives
 * the chosen ids. An automation's customer list shows 10 searched by first name (full name with
 * `amg_communications`) and gives the chosen parameter of each chosen customer who has one, with the chosen ids.
 */
@Component({
  selector: 'app-customer-list-recipients',
  templateUrl: './customer-list.component.html',
  imports: [FormFieldComponent, LabelComponent, SelectComponent, OptionComponent, CommunicationsTranslationPipe],
})
export class CustomerListComponent implements OnInit {
  private readonly directory = inject(RecipientDirectoryService);

  readonly context = input<RecipientContext>('send');
  /** Only the customers with an app token: the Firebase Customer list */
  readonly firebase = input(false);
  /** An automation's list: the address taken from each chosen customer */
  readonly parameter = input<RecipientParameter>('email');
  /** Changing an automation's recipient: its kept customers, chosen from the start */
  readonly keptCustomers = input<Customer[]>([]);
  /** Changing a Firebase recipient: the ids of its chosen customers */
  readonly presetIds = input<string[]>([]);

  readonly paramsChange = output<string>();
  readonly customerIdsChange = output<string[]>();

  /** The quick send's list: 25 customers searched by name and e-mail, giving their ids */
  private readonly quick = computed(() => this.firebase() || this.context() === 'send');
  private readonly loaded = signal<Customer[]>([]);
  private readonly known = signal<ReadonlyMap<string, Customer>>(new Map());
  protected readonly chosenIds = signal<string[]>([]);
  protected readonly options = computed<ChoiceOption[]>(() => {
    const withEmail = this.quick();
    return withChosen(this.loaded(), this.chosenIds(), this.known())
      .map(customer => ({value: customer._id, label: customerLabel(customer, withEmail)}));
  });
  /** An automation's parameters: the chosen parameter of each chosen customer who has one */
  private readonly addresses = computed(() => {
    const known = this.known();
    const parameter = this.parameter();
    return this.chosenIds()
      .map(id => known.get(id))
      .map(customer => customer && customerAddress(customer, parameter))
      .filter(Boolean)
      .join(',');
  });

  private searchesFullName = false;
  /** Counts the searches, so a slower older answer can't replace a newer one */
  private request = 0;

  constructor() {
    // An automation's list gives its parameters whenever they change: the chosen customers or the parameter
    effect(() => {
      if (this.quick()) return;
      const params = this.addresses();
      const ids = this.chosenIds();
      untracked(() => {
        this.paramsChange.emit(params);
        this.customerIdsChange.emit(ids);
      });
    });
  }

  async ngOnInit(): Promise<void> {
    const kept = this.keptCustomers();
    if (kept.length) {
      this.known.update(known => remember(known, kept));
      this.chosenIds.set(kept.map(customer => customer._id));
    }
    const presetIds = this.presetIds();
    if (presetIds.length) {
      this.chosenIds.set(presetIds);
      void this.loadChosen(presetIds);
    }
    if (!this.quick()) this.searchesFullName = await this.directory.searchesFullName();
    await this.load('');
  }

  protected search(term: string): void {
    void this.load(term);
  }

  protected choose(value: string[] | null): void {
    const ids = value ?? [];
    this.chosenIds.set(ids);
    if (this.quick()) this.paramsChange.emit(ids.join(','));
  }

  private async load(term: string): Promise<void> {
    const request = ++this.request;
    const quick = this.quick();
    const result = await this.directory.fetchCustomers(0, quick ? 25 : 10, quick ? this.quickQuery(term) : this.automationQuery(term));
    if (request !== this.request || !result?.success) return;
    const items = result.payload?.items ?? [];
    this.loaded.set(items);
    this.known.update(known => remember(known, items));
  }

  private quickQuery(term: string): CustomerQuery {
    const terms: EntityTerm[] = ['firstname', 'lastname', 'email']
      .map(property => ({property, fullText: true, language: null, term}));
    return {
      type: {$ne: 'organisation'},
      // The old customer list sent an empty filter
      filter: this.firebase() ? FIREBASE_FILTER : {},
      search: term ? {terms} : null,
    };
  }

  private automationQuery(term: string): CustomerQuery {
    const property = this.searchesFullName ? 'fullname' : 'firstname';
    return {type: {$ne: 'organisation'}, filter: [{property, fullText: true, language: false, term}]};
  }

  /** The chosen customers of a recipient being changed, so they show with their names */
  private async loadChosen(ids: string[]): Promise<void> {
    const result = await this.directory.fetchCustomers(0, Math.min(ids.length, 999), {fetch_in: {_id: ids}});
    if (!result?.success) return;
    this.known.update(known => remember(known, result.payload?.items ?? []));
  }
}
