import {Component, computed, inject, input, OnInit, output, signal} from '@angular/core';
import {FormFieldComponent, LabelComponent, OptionComponent, SelectComponent} from '../../../../../../ui-components';
import {CommunicationsTranslationPipe} from '../../../i18n/communications.translation';
import {RecipientDirectoryService} from '../../recipient-directory.service';
import {ChoiceOption, CustomerGroup, remember, withChosen} from '../../recipients.types';

const PAGE_SIZE = 50;

/** Customer group (GROUPS): a multiple choice of up to 50 customer groups, searched by name, giving their ids */
@Component({
  selector: 'app-customer-groups-recipients',
  templateUrl: './customer-groups.component.html',
  imports: [FormFieldComponent, LabelComponent, SelectComponent, OptionComponent, CommunicationsTranslationPipe],
})
export class CustomerGroupsComponent implements OnInit {
  private readonly directory = inject(RecipientDirectoryService);

  /** Changing a recipient: the ids of its chosen groups */
  readonly presetIds = input<string[]>([]);
  readonly paramsChange = output<string>();

  private readonly loaded = signal<CustomerGroup[]>([]);
  private readonly known = signal<ReadonlyMap<string, CustomerGroup>>(new Map());
  protected readonly chosenIds = signal<string[]>([]);
  protected readonly options = computed<ChoiceOption[]>(() =>
    withChosen(this.loaded(), this.chosenIds(), this.known()).map(group => ({value: group._id, label: group.name ?? ''})),
  );
  /** Counts the searches, so a slower older answer can't replace a newer one */
  private request = 0;

  async ngOnInit(): Promise<void> {
    this.chosenIds.set(this.presetIds());
    await this.load('');
  }

  protected search(term: string): void {
    void this.load(term);
  }

  protected choose(value: string[] | null): void {
    const ids = value ?? [];
    this.chosenIds.set(ids);
    this.paramsChange.emit(ids.join(','));
  }

  private async load(term: string): Promise<void> {
    const request = ++this.request;
    const options = term ? {filter: [{property: 'name', term, fullText: true}]} : {};
    const result = await this.directory.fetchCustomerGroups(0, PAGE_SIZE, options);
    if (request !== this.request || !result?.success) return;
    const items = result.payload?.items ?? [];
    this.loaded.set(items);
    this.known.update(known => remember(known, items));
  }
}
