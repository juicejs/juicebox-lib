import {Component, computed, effect, inject, input, signal, untracked} from '@angular/core';
import {DatePipe} from '@angular/common';
import {
  ButtonComponent,
  CellDefDirective,
  ColumnConfig,
  DataTableComponent,
  IconComponent,
  TooltipDirective,
} from '../../../../../ui-components';
import {PromiseButtonDirective} from '../../../../shared/directives/PromiseButton';
import {CommunicationsService} from '../../communications.service';
import {Communication, ScheduledTime} from '../../communications.types';
import {CommunicationsTranslationPipe} from '../../i18n/communications.translation';

/**
 * The automation's pending times, all at once, each with its time, "Pending" and a button that cancels it without
 * asking; the list is read again after (PENDING).
 */
@Component({
  selector: 'app-pending-times',
  templateUrl: './pending-times.component.html',
  imports: [
    DatePipe,
    DataTableComponent,
    CellDefDirective,
    ButtonComponent,
    IconComponent,
    TooltipDirective,
    PromiseButtonDirective,
    CommunicationsTranslationPipe,
  ],
  providers: [CommunicationsTranslationPipe],
})
export class PendingTimesComponent {
  private readonly communications = inject(CommunicationsService);
  private readonly i18n = inject(CommunicationsTranslationPipe);

  readonly communication = input<Communication | null>(null);
  protected readonly rows = signal<ScheduledTime[]>([]);
  /** All on one page */
  protected readonly pageSize = computed(() => Math.max(this.rows().length, 1));
  protected readonly cancelPromise = signal<Promise<void> | null>(null);
  protected readonly columns: ColumnConfig[] = [
    {key: 'time', label: this.i18n.transform('execution_time')},
    {key: 'status', label: this.i18n.transform('status')},
    {key: 'actions', label: this.i18n.transform('actions'), width: '100px', align: 'right', ellipsis: false},
  ];
  private request = 0;

  constructor() {
    // Read again whenever the dialog has read the automation again
    effect(() => {
      const communication = this.communication();
      untracked(() => void this.fetch(communication));
    });
  }

  protected cancel(row: ScheduledTime): void {
    this.cancelPromise.set(this.removeTime(row));
  }

  private async removeTime(row: ScheduledTime): Promise<void> {
    const communication = this.communication();
    if (!communication) return;
    await this.communications.removeFromSchedule(communication._id, row.ref);
    await this.fetch(communication);
  }

  private async fetch(communication: Communication | null): Promise<void> {
    const request = ++this.request;
    // An automation never scheduled has no pending times to read
    if (!communication?.scheduledTimestamps) {
      this.rows.set([]);
      return;
    }
    const result = await this.communications.fetchScheduleForCommunication(communication._id);
    if (request !== this.request) return;
    this.rows.set(Array.isArray(result) ? [] : (result?.items ?? []));
  }
}
