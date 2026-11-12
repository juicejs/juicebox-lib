import {inject, Injectable} from '@angular/core';
import {Juice} from '../../shared/services/juice.service';
import {Result} from '../../shared/types/Result';
import {
  Communication,
  CommunicationChannel,
  CommunicationContent,
  CommunicationEvent,
  CommunicationListOptions,
  CommunicationRecipient,
  HistoryEntry,
  RecipientProviderMeta,
  RunStarted,
  ScheduledTime,
  SelectionType,
  ServiceFailure,
  TaskQueue,
} from './communications.types';

const SERVICE = 'communication-service';

/**
 * `communication-service`, called with the arguments the old juicebox gave it. The answers are typed as the backend
 * gives them: some are a `Result`, others a plain object, array or value.
 */
@Injectable({providedIn: 'root'})
export class CommunicationsService {
  private readonly juice = inject(Juice);

  // Channels, recipient providers and events

  /** The channels whose name contains `name`, of one kind of delivery (`adapter`) or all */
  searchChannel(name = '', adapter: string | null = null): Promise<CommunicationChannel[]> {
    return this.request('searchChannel', [name, adapter]);
  }

  /** The recipient providers, those delivering through the channel (`options.channel`) where one is given */
  searchRecipients(options: {channel?: string} = {}): Promise<RecipientProviderMeta[]> {
    return this.request('searchRecipients', [options]);
  }

  getReceiverSupportedSelectionTypes(providerRef: string): Promise<Result<SelectionType[]>> {
    return this.request('getReceiverSupportedSelectionTypes', [providerRef]);
  }

  /** The customer ids the provider's parameters reach */
  prerenderRecipients(providerRef: string, params: string): Promise<Result<string[]>> {
    return this.request('prerenderRecipients', [providerRef, params]);
  }

  searchEvents(name: string): Promise<CommunicationEvent[]> {
    return this.request('searchEvents', [name]);
  }

  // Quick send and runs

  /** Sends at once: the quick send */
  send(recipients: CommunicationRecipient[], subject: string, template: string, channel: string): Promise<RunStarted> {
    return this.request('send', [{recipients, subject, content: {template, subject}, channel}]);
  }

  /** Runs an automation at once, started by the staff member */
  sendCommunication(communicationId: string): Promise<RunStarted> {
    return this.request('sendCommunication', [communicationId]);
  }

  /** A run's task, with its progress */
  getQueue(queueId: string): Promise<TaskQueue | null> {
    return this.request('getQueue', [queueId]);
  }

  /** The automation's runs still going */
  getQueueByParam(communicationId: string): Promise<TaskQueue[]> {
    return this.request('getQueueByParam', [communicationId]);
  }

  /** The runs of the automation's scheduled times */
  getCommunicationQueues(communicationId: string, page: number, pageSize: number): Promise<Result<TaskQueue[]>> {
    return this.request('getCommunicationQueues', [communicationId, page, pageSize]);
  }

  // Automations

  fetchCommunications(page: number, pageSize: number, options: CommunicationListOptions): Promise<{count: number; communications: Communication[]} | ServiceFailure> {
    return this.request('fetchCommunications', [page, pageSize, options]);
  }

  getCommunication(communicationId: string): Promise<Communication | null> {
    return this.request('getCommunication', [communicationId]);
  }

  /** Answers the new automation's id */
  createCommunication(data: {name: string; event: string | null; channel: string}): Promise<string> {
    return this.request('createCommunication', [data]);
  }

  updateCommunication(communicationId: string, data: Partial<Communication>): Promise<{success: boolean; [extra: string]: unknown}> {
    return this.request('updateCommunication', [communicationId, data]);
  }

  /** Switches an automation on or off */
  switchState(communicationId: string, active: boolean): Promise<{success: boolean}> {
    return this.request('switchState', [communicationId, active]);
  }

  deleteCommunication(communicationId: string): Promise<{success: boolean}> {
    return this.request('deleteCommunication', [communicationId]);
  }

  // An automation's recipients

  addRecipient(communicationId: string, recipient: CommunicationRecipient): Promise<true | ServiceFailure> {
    return this.request('addRecipient', [communicationId, recipient]);
  }

  updateRecipient(communicationId: string, recipient: CommunicationRecipient): Promise<true | ServiceFailure> {
    return this.request('updateRecipient', [communicationId, recipient]);
  }

  /** Removes the recipient, and every other one with the same provider and parameters (the backend's way) */
  deleteRecipient(communicationId: string, recipient: CommunicationRecipient): Promise<{success: boolean}> {
    return this.request('deleteRecipient', [communicationId, recipient]);
  }

  /** The customers kept with a recipient (customer list, form customers), of the staff member's organisation */
  fetchCustomerModels(communicationId: string, recipientId: string): Promise<{success: boolean; entities: Record<string, unknown>[]; error?: string}> {
    return this.request('fetchCustomerModels', [communicationId, recipientId]);
  }

  // Scheduling

  scheduleCommunication(communicationId: string, date: Date): Promise<{success: boolean}> {
    return this.request('scheduleCommunication', [communicationId, date]);
  }

  /** The pending times; `[]` when nothing was ever scheduled */
  fetchScheduleForCommunication(communicationId: string): Promise<{success: boolean; items: ScheduledTime[]} | []> {
    return this.request('fetchScheduleForCommunication', [communicationId]);
  }

  removeFromSchedule(communicationId: string, ref: string): Promise<{success: boolean}> {
    return this.request('removeFromSchedule', [communicationId, ref]);
  }

  // Contents

  fetchContents(page: number, pageSize: number, options: CommunicationListOptions): Promise<{count: number; contents: CommunicationContent[]} | ServiceFailure> {
    return this.request('fetchContents', [page, pageSize, options]);
  }

  searchContents(terms: unknown[], page: number, pageSize: number, options: Record<string, unknown>): Promise<{count: number; contents: CommunicationContent[]}> {
    return this.request('searchContents', [terms, page, pageSize, options]);
  }

  getContent(contentId: string): Promise<CommunicationContent | null> {
    return this.request('getContent', [contentId]);
  }

  /** Answers the new content's id */
  createContent(content: Partial<CommunicationContent>): Promise<string> {
    return this.request('createContent', [content]);
  }

  updateContent(contentId: string, data: Partial<CommunicationContent>): Promise<boolean> {
    return this.request('updateContent', [contentId, data]);
  }

  deleteContent(contentId: string): Promise<boolean> {
    return this.request('deleteContent', [contentId]);
  }

  /** The tags of every organisation's contents (AMG), each as `{tag}` */
  getContentTags(): Promise<{success: boolean; payload?: Array<{tag: string | null}>; error?: string}> {
    return this.request('getContentTags', []);
  }

  // History

  getCommunicationsHistory(page: number, pageSize: number, options: CommunicationListOptions): Promise<Result<{history: HistoryEntry[]; count: number}>> {
    return this.request('getCommunicationsHistory', [page, pageSize, options]);
  }

  private request<T>(method: string, params: unknown[]): Promise<T> {
    return this.juice.request(SERVICE, method, params);
  }
}
