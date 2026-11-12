import {Component, computed, effect, inject, input, signal, untracked} from '@angular/core';
import {DatePipe} from '@angular/common';
import {CellDefDirective, ColumnConfig, DataTableComponent, PageEvent} from '../../../../../ui-components';
import {CommunicationsService} from '../../communications.service';
import {Communication, TaskQueue} from '../../communications.types';
import {CommunicationsTranslationPipe} from '../../i18n/communications.translation';

const PAGE_SIZE = 10;

interface StartedRow {
  _id: string;
  /** The scheduled time that started the run */
  time: string | null;
  progress: number;
  done: string;
  failed: string;
}

/**
 * The runs of the automation's scheduled times, newest first, 10 to a page: each with the time it started, its
 * progress, whether it is done and whether it failed (STARTED).
 */
@Component({
  selector: 'app-started-times',
  templateUrl: './started-times.component.html',
  imports: [DatePipe, DataTableComponent, CellDefDirective, CommunicationsTranslationPipe],
  providers: [CommunicationsTranslationPipe],
})
export class StartedTimesComponent {
  private readonly communications = inject(CommunicationsService);
  private readonly i18n = inject(CommunicationsTranslationPipe);

  readonly communication = input<Communication | null>(null);
  protected readonly pageSize = PAGE_SIZE;
  protected readonly pageSizeOptions = [PAGE_SIZE];
  protected readonly page = signal(1);
  private readonly runs = signal<TaskQueue[]>([]);
  private readonly answers = {yes: this.i18n.transform('yes'), no: this.i18n.transform('no')};

  /** The time each run started at, by its task: the scheduled time that holds it */
  private readonly startTimes = computed(() => new Map((this.communication()?.scheduledTimestamps ?? [])
    .filter(scheduled => scheduled.q)
    .map(scheduled => [String(scheduled.q), scheduled.time])));
  protected readonly count = computed(() => this.startTimes().size);
  protected readonly rows = computed<StartedRow[]>(() => {
    const startTimes = this.startTimes();
    return this.runs().map(run => ({
      _id: run._id,
      time: startTimes.get(String(run._id)) ?? null,
      progress: run.progress ?? 0,
      done: run.done ? this.answers.yes : this.answers.no,
      failed: run.failed ? this.answers.yes : this.answers.no,
    }));
  });
  protected readonly columns: ColumnConfig[] = [
    {key: 'time', label: this.i18n.transform('execution_time')},
    {key: 'progress', label: this.i18n.transform('progress')},
    {key: 'done', label: this.i18n.transform('done')},
    {key: 'failed', label: this.i18n.transform('failed')},
  ];
  private request = 0;

  constructor() {
    // From the first page whenever the dialog has read the automation again
    effect(() => {
      const communication = this.communication();
      untracked(() => {
        this.page.set(1);
        void this.fetch(communication);
      });
    });
  }

  protected onPage(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    void this.fetch(this.communication());
  }

  private async fetch(communication: Communication | null): Promise<void> {
    const request = ++this.request;
    // An automation never scheduled has no runs of its scheduled times
    if (!communication?.scheduledTimestamps) {
      this.runs.set([]);
      return;
    }
    const result = await this.communications.getCommunicationQueues(communication._id, this.page() - 1, PAGE_SIZE);
    if (request !== this.request) return;
    this.runs.set(result?.success ? (result.payload ?? []) : []);
  }
}
