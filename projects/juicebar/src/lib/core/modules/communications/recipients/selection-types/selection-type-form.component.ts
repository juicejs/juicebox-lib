import {Component, computed, input, output} from '@angular/core';
import {RecipientParameter, SelectionType} from '../../communications.types';
import {Customer, RecipientContext} from '../recipients.types';
import {AttributeFilterComponent} from './attribute-filter/attribute-filter.component';
import {CustomerGroupsComponent} from './customer-groups/customer-groups.component';
import {CustomerListComponent} from './customer-list/customer-list.component';
import {EventParamsComponent} from './event-params/event-params.component';
import {FormCustomersComponent} from './form-customers/form-customers.component';

/**
 * The form of a selection type (SELTYPES), in the quick send and in an automation's recipient dialog; it gives the
 * recipient's parameters and, for a customer list or form customers in an automation, the chosen customers' ids
 */
@Component({
  selector: 'app-selection-type-form',
  templateUrl: './selection-type-form.component.html',
  imports: [CustomerListComponent, CustomerGroupsComponent, EventParamsComponent, AttributeFilterComponent, FormCustomersComponent],
})
export class SelectionTypeFormComponent {
  readonly type = input.required<SelectionType>();
  readonly context = input<RecipientContext>('send');
  /** An automation's recipient: the address taken from each chosen customer */
  readonly parameter = input<RecipientParameter>('email');
  /** Changing a recipient: its parameters */
  readonly presetParams = input('');
  /** Changing a recipient: its kept customers (customer list, form customers) */
  readonly keptCustomers = input<Customer[]>([]);
  /** Changing a recipient: the form of form customers can't be changed */
  readonly formLocked = input(false);

  readonly paramsChange = output<string>();
  readonly customerIdsChange = output<string[]>();

  protected readonly presetIds = computed(() => {
    const params = this.presetParams();
    return params ? params.split(',') : [];
  });
  protected readonly presetFormId = computed(() => this.presetParams().split(':')[0] || null);
  /** The quick send gives the event property once typing has paused for a second */
  protected readonly eventPause = computed(() => this.context() === 'send' ? 1000 : 0);
}
