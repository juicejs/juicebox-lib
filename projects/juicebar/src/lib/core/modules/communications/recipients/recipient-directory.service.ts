import {inject, Injectable} from '@angular/core';
import {ConfigurationService} from '../../../shared/services/configuration.service';
import {Juice} from '../../../shared/services/juice.service';
import {Result} from '../../../shared/types/Result';
import {Customer, CustomerAttribute, CustomerForm, CustomerGroup, EntityTerm} from './recipients.types';

/** The options `entities#fetchEntities` takes */
export interface CustomerQuery {
  type?: unknown;
  filter?: EntityTerm[] | Record<string, never>;
  search?: {terms: EntityTerm[]} | null;
  fetch_in?: {_id: string[]};
}

/**
 * The other backends the selection types read: the customers of the entities module (CustomerDirectory), the forms
 * and their customers (FormCustomers) and the backend configuration. Called with the arguments the old juicebox gave.
 */
@Injectable({providedIn: 'root'})
export class RecipientDirectoryService {
  private readonly juice = inject(Juice);
  private readonly configuration = inject(ConfigurationService);

  // Customers (`entities`, which asks for `entities:role`)

  fetchCustomers(page: number, pageSize: number, query: CustomerQuery): Promise<Result<{count: number; items: Customer[]}>> {
    return this.juice.request('entities', 'fetchEntities', [page, pageSize, query]);
  }

  fetchCustomerGroups(page: number, pageSize: number, options: {filter?: EntityTerm[]}): Promise<Result<{count: number; items: CustomerGroup[]}>> {
    return this.juice.request('entities', 'fetchEntityGroups', [page, pageSize, options]);
  }

  /** Every distinct value of the attribute among the organisation's customers, each as `{value}` */
  searchAttributeValues(attribute: string): Promise<Result<Array<{value: unknown}>>> {
    return this.juice.request('entities', 'searchAttributeValues', [0, 100, {attribute}]);
  }

  /** The customer attributes the `juicecommerce:entity:attribute` configurations declare */
  fetchCustomerAttributes(): Promise<Result<CustomerAttribute[]>> {
    return this.configuration.getBySchema('juicecommerce:entity:attribute');
  }

  // Forms (`ticketing:forms` and `forms:entities`, which ask for `forms:role`)

  fetchForms(page: number, pageSize: number): Promise<Result<{forms: CustomerForm[]; count: number}>> {
    return this.juice.request('ticketing:forms', 'fetch', [page, pageSize, {}, {}]);
  }

  /** The forms not archived whose name contains `name` */
  searchForms(name: string, page: number, pageSize: number): Promise<Result<{forms: CustomerForm[]; count: number}>> {
    const terms: EntityTerm[] = [{property: 'name', fullText: true, language: false, term: name}];
    return this.juice.request('ticketing:forms', 'search', [page, pageSize, {archived: false}, null, {terms}]);
  }

  getForm(formId: string): Promise<Result<{form: CustomerForm}>> {
    return this.juice.request('ticketing:forms', 'getForm', [formId]);
  }

  /** The customers who filled the form in, other than organisations; `search` holds a text per field */
  fetchFormCustomers(page: number, pageSize: number, formId: string, search: Record<string, string>): Promise<Result<{entities: Customer[]; count: number}>> {
    return this.juice.request('forms:entities', 'fetch', [page, pageSize, {
      filters: {type: {$ne: 'organisation'}, form_id: formId, search},
    }]);
  }

  // Configuration

  /** A backend configuration entry; unsuccessful where the project has none */
  getConfiguration<T>(key: string): Promise<Result<T>> {
    return this.configuration.getByKey(key);
  }

  /** The `communications` configuration's `amg_communications`: customers are searched by full name */
  async searchesFullName(): Promise<boolean> {
    const result = await this.getConfiguration<{options?: {amg_communications?: unknown}}>('communications');
    return !!(result?.success && result.payload?.options?.amg_communications);
  }
}
