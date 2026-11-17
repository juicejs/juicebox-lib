import {inject, Injectable} from '@angular/core';
import {Juice} from '../../shared/services/juice.service';
import {ActionButton} from '../../shared/types/ActionButton';
import {Result} from '../../shared/types/Result';
import {
  ApiKey,
  Entity,
  EntityFetchOptions,
  EntityGroup,
  EntityMediaData,
  EntityPage,
  EntitySearchTerm,
  EntityWallet,
  MailingHistoryItem,
  MailingProvider,
  PushNotification,
  WalletPublisher,
} from './entities.types';

/** The backend service of the customers */
const SERVICE = 'entities';

/**
 * The customers module's backend calls, under the old juicebox's method names. Other projects share these backends:
 * the services, the method names, the argument order and the payloads stay exactly as the old juicebox sent them.
 * A project's own modules use the service too, so it also has the calls only they make (at the end).
 */
@Injectable({providedIn: 'root'})
export class EntitiesService {
  private readonly juice = inject(Juice);

  /** Page buttons a project's other modules add to the listing; shown where the backend has an `amgshop` configuration */
  readonly customActionButtons: ActionButton[] = [];

  addCustomActionButton(actionButton: ActionButton): void {
    this.customActionButtons.push(actionButton);
  }

  // Customers

  /** `page` starts at 0 */
  fetch(page: number, pageSize: number, options: EntityFetchOptions): Promise<Result<EntityPage<Entity>>> {
    return this.juice.request(SERVICE, 'fetchEntities', [page, pageSize, options]);
  }

  get(entityId: string): Promise<Result<Entity>> {
    return this.juice.request(SERVICE, 'fetchEntityById', [entityId]);
  }

  create(data: Record<string, unknown>): Promise<Result<Entity>> {
    return this.juice.request(SERVICE, 'createEntity', [data]);
  }

  put(entityId: string, data: Record<string, unknown>): Promise<Result<Entity>> {
    return this.juice.request(SERVICE, 'updateEntity', [entityId, data]);
  }

  delete(entityId: string): Promise<Result> {
    return this.juice.request(SERVICE, 'deleteEntity', [entityId]);
  }

  // Addresses

  createAddress(entityId: string, data: Record<string, unknown>): Promise<Result<Entity>> {
    return this.juice.request(SERVICE, 'addAddress', [entityId, data]);
  }

  updateAddress(entityId: string, data: Record<string, unknown>): Promise<Result<Entity>> {
    return this.juice.request(SERVICE, 'updateAddress', [entityId, data]);
  }

  // Attributes

  updateAttributes(entityId: string, data: Record<string, unknown>): Promise<Result> {
    return this.juice.request(SERVICE, 'updateEntityAttributes', [entityId, data]);
  }

  /** Adds an attribute field to the backend's configurations */
  createAttribute(data: Record<string, unknown>): Promise<Result> {
    return this.juice.request(SERVICE, 'createAttribute', [data]);
  }

  /** Removes an attribute field from the backend's configurations; takes the field's configuration */
  deleteAttribute(attribute: unknown): Promise<Result> {
    return this.juice.request(SERVICE, 'deleteAttribute', [attribute]);
  }

  /** The values the customers hold for an attribute: the first 100 */
  searchAttributeValues(options: {attribute: string; type?: string}): Promise<Result<Array<{value: unknown}>>> {
    return this.juice.request(SERVICE, 'searchAttributeValues', [0, 100, options]);
  }

  // Files

  uploadMedia(entityId: string, file: File, data: EntityMediaData): Promise<Result<Entity>> {
    return this.juice.request(SERVICE, 'uploadMedia', [entityId, data], file);
  }

  /** The file's bytes */
  downloadMedia(entityId: string, mediaId: string): Promise<Result<{data: ArrayLike<number>}>> {
    return this.juice.request(SERVICE, 'getMedia', [entityId, mediaId]);
  }

  updateMedia(entityId: string, mediaId: string, data: EntityMediaData, file?: File): Promise<Result> {
    return this.juice.request(SERVICE, 'updateMedia', [entityId, mediaId, data], file);
  }

  deleteMedia(entityId: string, mediaId: string): Promise<Result> {
    return this.juice.request(SERVICE, 'deleteMedia', [entityId, mediaId]);
  }

  // A customer's form files and images

  /** One of the files under the customer's `attributes.files` */
  fetchFile(entityId: string, fileId: string): Promise<Blob> {
    return this.juice.requestBinary(SERVICE, 'fetchFile', [entityId, fileId]);
  }

  /** Sends a file to the forms module, for the form entry the customer came in with */
  uploadFormImage(formDataId: string | undefined, file: File): Promise<unknown> {
    return this.juice.getHttpUtil().upload('/forms/upload/' + formDataId, file);
  }

  /**
   * Adds an image to the customer (`entities#uploadLogo`), which the backend stores in three sizes. The image is the
   * request's body, as with `uploadMedia`; the old juicebox sent it among the JSON arguments, where it arrived empty.
   */
  uploadImage(entityId: string, image: File): Promise<Result<Entity>> {
    return this.juice.request(SERVICE, 'uploadLogo', [entityId], image);
  }

  // Customer groups

  createNewEntityGroup(name: string): Promise<Result<EntityGroup>> {
    return this.juice.request(SERVICE, 'createNewEntityGroup', [{name}]);
  }

  fetchEntityGroups(
    page: number,
    pageSize: number,
    options: {filter?: Array<Pick<EntitySearchTerm, 'property' | 'term' | 'fullText'>>; id_filter?: string[]; id_exclude?: boolean},
  ): Promise<Result<EntityPage<EntityGroup>>> {
    return this.juice.request(SERVICE, 'fetchEntityGroups', [page, pageSize, options]);
  }

  deleteGroup(groupId: string): Promise<Result> {
    return this.juice.request(SERVICE, 'deleteEntityGroup', [groupId]);
  }

  updateEntityGroup(groupId: string, name: string): Promise<Result> {
    return this.juice.request(SERVICE, 'updateEntityGroup', [groupId, {name}]);
  }

  getGroupById(groupId: string): Promise<Result<EntityGroup>> {
    return this.juice.request(SERVICE, 'fetchGroupById', [groupId]);
  }

  // Wallets (the project's ledger)

  fetchPublishers(page: number, pageSize: number, filter: Record<string, unknown>): Promise<Result<{publishers: WalletPublisher[]}>> {
    return this.juice.request('juicechain:publishers', 'fetch', [page, pageSize, {filters: filter}]);
  }

  createWallet(entityId: string, data: Record<string, unknown>): Promise<Result> {
    return this.juice.request('juicechain:wallets', 'createWallet', [entityId, data, true]);
  }

  deleteWallet(entityId: string, wallet: EntityWallet): Promise<Result> {
    return this.juice.request('juicechain:wallets', 'deleteWallet', [entityId, wallet]);
  }

  // An organisation's payment account (Stripe)

  unlinkStripeAccount(organisationId: string): Promise<Result> {
    return this.juice.request('stripe', 'unlinkAccountFromVendor', [organisationId]);
  }

  checkDetailsSubmitted(organisationId: string): Promise<Result<{detailsSubmitted?: boolean}>> {
    return this.juice.request('stripe', 'checkAccountDetailsSubmitted', [organisationId]);
  }

  // Messages sent to a customer

  getMailingProviders(): Promise<Result<MailingProvider[]>> {
    return this.juice.request('mailing-provider-history', 'getProviders', []);
  }

  /** `page` starts at 0 */
  fetchMailingHistory(provider: string | null, entityId: string, page: number, pageSize: number): Promise<Result<EntityPage<MailingHistoryItem>>> {
    return this.juice.request('mailing-provider-history', 'fetchHistory', [provider, entityId, page, pageSize]);
  }

  /** `page` starts at 0 */
  getPushNotifications(entityId: string, language: string, page: number, pageSize: number): Promise<Result<EntityPage<PushNotification>>> {
    return this.juice.request('entity:shop:service', 'getPushNotifications', [entityId, language, page, pageSize]);
  }

  // An organisation's API keys

  getApiKeys(organisationId: string): Promise<Result<ApiKey[]>> {
    return this.juice.request(SERVICE, 'getOrganisationsApiKeys', [organisationId]);
  }

  generateApiKey(name: string, organisationId: string): Promise<Result<{key: ApiKey; token: string}>> {
    return this.juice.request(SERVICE, 'generateOrganisationApiKey', [name, organisationId]);
  }

  deleteApiKey(keyId: string, organisationId: string): Promise<Result> {
    return this.juice.request(SERVICE, 'deleteOrganisationApiKey', [keyId, organisationId]);
  }

  // Not called by the module itself: a project's other modules call these, as in the old juicebox

  /** @deprecated Use updateAttributes() */
  updateFooter(organisationId: string, footer: {footer: string}): Promise<Result> {
    return this.juice.request(SERVICE, 'updateEntityAttributes', [organisationId, footer]);
  }

  addMedia(organisationId: string, media: unknown): Promise<Result> {
    return this.juice.request(SERVICE, 'addMedia', [organisationId, media]);
  }

  removeMedia(organisationId: string, media: unknown): Promise<Result> {
    return this.juice.request(SERVICE, 'removeMedia', [organisationId, media]);
  }

  /** The address of one of the customer's form files */
  fetchFileUrl(entityId: string, fileId: string): string {
    return `${this.juice.getEndPoint()}/juicebox/entities/file/${entityId}/${fileId}`;
  }

  /** One of the customer's images (`entities#fetchImage`); the old juicebox's method called the upload by mistake */
  fetchImage(entityId: string, imageId: string): Promise<unknown> {
    return this.juice.request(SERVICE, 'fetchImage', [entityId, imageId]);
  }

  returnAsset(entityId: string, assetId: string): Promise<Result> {
    return this.juice.request('juicechain', 'returnAsset', [entityId, assetId]);
  }

  getWalletRestore(address: string, type: string, entityId: string): Promise<unknown> {
    return this.juice.getHttpUtil().get(`/juicebox/wallets/restore/${type}/${address}/${entityId}`);
  }

  createStripeAccount(email: string): Promise<Result> {
    return this.juice.request('stripe', 'createAccount', [email]);
  }

  fetchAccountLink(): Promise<Result> {
    return this.juice.request('stripe', 'getAccountLink', []);
  }

  fetchAccountLoginLink(): Promise<Result> {
    return this.juice.request('stripe', 'getAccountLoginLink', []);
  }
}
