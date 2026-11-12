import {Component, computed, inject, LOCALE_ID, OnInit, signal} from '@angular/core';
import {formatDate} from '@angular/common';
import {CellDefDirective, ColumnConfig, DataTableComponent, IconComponent, PageEvent} from '../../../../ui-components';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {CommunicationsService} from '../communications.service';
import {CommunicationChannel, HistoryEntry} from '../communications.types';
import {CommunicationsTranslationPipe} from '../i18n/communications.translation';

/**
 * A history entry as the backend answers it: the run, over the automation it ran (when that still exists), with the
 * name of the staff member who started it
 */
interface HistoryRun extends HistoryEntry {
  name?: string;
  userName?: string;
  scheduledTimestamps?: unknown;
}

interface HistoryRow {
  _id: string;
  name: string;
  date: string;
  event: string;
  channel: string;
  startedBy: string;
  startedByIcon: string;
}

/**
 * The History tab (History): the runs of the staff member's organisation, newest first, 10 to a page. A run can't be
 * opened.
 */
@Component({
  selector: 'app-communications-history',
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss',
  imports: [DataTableComponent, CellDefDirective, IconComponent, CommunicationsTranslationPipe],
  providers: [CommunicationsTranslationPipe],
})
export class HistoryComponent implements OnInit {
  private readonly communications = inject(CommunicationsService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly i18n = inject(CommunicationsTranslationPipe);
  private readonly locale = inject(LOCALE_ID);
  private readonly labels = {
    customCommunication: this.i18n.transform('custom_communication'),
    scheduledProcess: this.i18n.transform('scheduled_proccess'),
    automatedProcess: this.i18n.transform('automated_proccess'),
  };

  protected readonly page = signal(1);
  protected readonly pageSize = 10;
  protected readonly pageSizeOptions = [10];
  protected readonly count = signal(0);
  private readonly runs = signal<HistoryRun[]>([]);
  private readonly channels = signal<CommunicationChannel[]>([]);
  private request = 0;

  protected readonly columns: ColumnConfig[] = [
    {key: 'name', label: this.i18n.transform('name_communication')},
    {key: 'date', label: this.i18n.transform('date_sent')},
    {key: 'event', label: this.i18n.transform('event')},
    {key: 'channel', label: this.i18n.transform('channel')},
    {key: 'startedBy', label: this.i18n.transform('started_by')},
  ];

  protected readonly rows = computed<HistoryRow[]>(() => {
    const channelNames = new Map(this.channels().map(channel => [channel.key, channel.name]));
    return this.runs().map(run => this.toRow(run, channelNames));
  });

  async ngOnInit(): Promise<void> {
    this.juicebox.navigationEvent({
      location: this.i18n.transform('communications'),
      subject: this.i18n.transform('history'),
      link: '/main/communications/history',
    });
    await Promise.all([this.loadChannels(), this.fetch()]);
  }

  protected onPage(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    void this.fetch();
  }

  private async loadChannels(): Promise<void> {
    const channels = await this.communications.searchChannel();
    this.channels.set(Array.isArray(channels) ? channels : []);
  }

  private async fetch(): Promise<void> {
    const request = ++this.request;
    const result = await this.communications.getCommunicationsHistory(this.page() - 1, this.pageSize, {});
    if (request !== this.request || !result?.success || !result.payload) return;
    this.runs.set(result.payload.history as HistoryRun[]);
    this.count.set(result.payload.count);
  }

  private toRow(run: HistoryRun, channelNames: Map<string, string>): HistoryRow {
    const event = run.event as {name?: string} | string | null | undefined;
    const startedBy = run.userName
      ? {startedBy: run.userName, startedByIcon: 'person'}
      : run.scheduledTimestamps
        ? {startedBy: this.labels.scheduledProcess, startedByIcon: 'schedule'}
        : {startedBy: this.labels.automatedProcess, startedByIcon: 'settings'};
    return {
      _id: run._id,
      name: run.name || this.labels.customCommunication,
      date: run.date ? formatDate(run.date, 'medium', this.locale) : '',
      event: typeof event === 'string' ? event : (event?.name ?? ''),
      channel: run.channel ? (channelNames.get(run.channel) ?? run.channel) : '',
      ...startedBy,
    };
  }
}
