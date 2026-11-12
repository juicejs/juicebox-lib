import {Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {Location} from '@angular/common';
import {Router, RouterLink} from '@angular/router';
import {
  ButtonComponent,
  CellDefDirective,
  ColumnConfig,
  CompactRowDefDirective,
  DataTableComponent,
  DialogService,
  HeaderDefDirective,
  IconComponent,
  PageEvent,
  TooltipDirective,
} from '../../../../../ui-components';
import {
  ConfirmationDialogComponent,
  ConfirmationDialogData,
} from '../../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import {injectListingPane, ListingStateService} from '../../../../shared/components/listing-pane/listing-pane';
import {PromiseButtonDirective} from '../../../../shared/directives/PromiseButton';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {CommunicationsService} from '../../communications.service';
import {Communication} from '../../communications.types';
import {CommunicationsTranslationPipe} from '../../i18n/communications.translation';
import {ScheduleDialogComponent, ScheduleDialogData} from '../../schedule/schedule-dialog/schedule-dialog.component';
import {AutomationCreateDialogComponent} from '../automation-create-dialog/automation-create-dialog.component';

/** The events of the `communications` configuration the list knows (EVENTS) */
const MANUAL_EVENT = 'static-communication-event';
const SCHEDULED_EVENT = 'schedule-communication-event';

const DETAILS_URL = '/main/communications/automation/details';
const PAGE_SIZE = 10;
/** The name filter waits for typing to pause (AUTOLIST) */
const FILTER_DELAY_MS = 500;
/** A run's progress is read this often, and its bar stays this long after it ended (RUNNOW) */
const PROGRESS_INTERVAL_MS = 2500;
const RUN_END_DELAY_MS = 2000;
const STATE_KEY = 'communications-automation';

/** A run being followed: its task and the progress last read */
interface FollowedRun {
  queue: string;
  progress: number;
  /** Done or failed: the bar goes 2 seconds later */
  ended: boolean;
}

interface AutomationRow {
  _id: string;
  name: string;
  active: boolean;
  status: string;
  /** Status and event, the line under the name in the compact list */
  summary: string;
  count: number;
  event: string;
  manual: boolean;
  scheduled: boolean;
  /** A run is followed: Run and Schedule are disabled meanwhile */
  running: boolean;
  /** Only a manual automation shows the bar of its run (RUNNOW) */
  showProgress: boolean;
  progress: number;
}

/** What the listing shows, kept for the compact list next to an open automation */
interface AutomationListingState {
  page: number;
  name: string;
}

/**
 * The Automation tab (AutomationList): the automations 10 to a page with their status, runs, event and the progress
 * of a run going, filtered by name in the table header. Start/Stop, Delete, and Run or Schedule on each row; Create is
 * the page's action. A click opens an automation for staff with `updated`, with Ctrl in a new browser tab. Next to an
 * open automation (the split view) it is the compact list of the rows it showed last.
 */
@Component({
  selector: 'app-automation-list',
  templateUrl: './automation-list.component.html',
  styleUrl: './automation-list.component.scss',
  imports: [
    RouterLink,
    DataTableComponent,
    CellDefDirective,
    CompactRowDefDirective,
    HeaderDefDirective,
    ButtonComponent,
    IconComponent,
    TooltipDirective,
    PromiseButtonDirective,
    CommunicationsTranslationPipe,
  ],
  providers: [CommunicationsTranslationPipe],
  host: {
    // The table only gives the row clicked; its click event bubbles here after it, with the Ctrl key (AUTOOPEN)
    '(click)': 'openClicked($event)',
  },
})
export class AutomationListComponent implements OnInit, OnDestroy {
  /** Set when this is the compact list next to an open automation, not the page itself */
  protected readonly pane = injectListingPane();
  private readonly listingState = inject(ListingStateService);
  private readonly communications = inject(CommunicationsService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly dialog = inject(DialogService);
  private readonly router = inject(Router);
  private readonly addressBar = inject(Location);
  private readonly i18n = inject(CommunicationsTranslationPipe);

  /** Opening an automation needs `updated` (AUTOOPEN) */
  protected readonly canOpen = !!this.juicebox.hasPermission('communication:role#updated');
  protected readonly detailsUrl = DETAILS_URL;
  protected readonly pageSize = PAGE_SIZE;
  protected readonly pageSizeOptions = [PAGE_SIZE];
  protected readonly page = signal(1);
  protected readonly count = signal(0);
  private readonly listed = signal<Communication[]>([]);
  /** The runs followed, by automation id */
  private readonly runs = signal<Record<string, FollowedRun>>({});
  protected readonly runPromise = signal<Promise<void> | null>(null);
  private readonly statusLabels = {enabled: this.i18n.transform('enabled'), disabled: this.i18n.transform('disabled')};
  private nameFilter = '';
  private clickedRow: AutomationRow | null = null;
  private request = 0;
  private reading = false;
  private destroyed = false;
  private filterTimer?: ReturnType<typeof setTimeout>;
  private progressTimer?: ReturnType<typeof setInterval>;
  private readonly endTimers = new Set<ReturnType<typeof setTimeout>>();

  protected readonly rows = computed<AutomationRow[]>(() => {
    const runs = this.runs();
    return this.listed().map(communication => {
      const run = runs[communication._id];
      const status = communication.active ? this.statusLabels.enabled : this.statusLabels.disabled;
      const event = communication.event ?? '';
      const manual = event === MANUAL_EVENT;
      return {
        _id: communication._id,
        name: communication.name ?? '',
        active: !!communication.active,
        status,
        summary: [status, event].filter(Boolean).join(' · '),
        count: communication.count ?? 0,
        event,
        manual,
        scheduled: event === SCHEDULED_EVENT,
        running: !!run,
        showProgress: manual && !!run,
        progress: run?.progress ?? 0,
      };
    });
  });

  protected readonly columns: ColumnConfig[] = [
    {key: 'status', label: this.i18n.transform('state'), width: '130px'},
    {key: 'name', label: this.i18n.transform('name_communication')},
    {key: 'count', label: this.i18n.transform('requests_send'), width: '150px'},
    {key: 'event', label: this.i18n.transform('requests_event')},
    {key: 'progress', label: this.i18n.transform('progress'), width: '160px', ellipsis: false},
    {key: 'actions', label: this.i18n.transform('actions'), width: '180px', align: 'right', ellipsis: false},
  ];

  async ngOnInit(): Promise<void> {
    if (this.pane) {
      const state = this.listingState.restore<AutomationListingState>(STATE_KEY);
      if (state) {
        this.page.set(state.page);
        this.nameFilter = state.name;
      }
    } else {
      this.juicebox.navigationEvent({
        location: this.i18n.transform('communications'),
        subject: this.i18n.transform('automation'),
        link: '/main/communications/automation',
      });
      this.juicebox.setActionButtons([{
        title: this.i18n.transform('create'),
        type: 'btn-primary',
        icon: 'add',
        callback: () => this.openCreate(),
      }]);
      this.progressTimer = setInterval(() => void this.readProgress(), PROGRESS_INTERVAL_MS);
    }
    await this.fetch();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    clearTimeout(this.filterTimer);
    clearInterval(this.progressTimer);
    this.endTimers.forEach(timer => clearTimeout(timer));
  }

  protected onFilter(value: string): void {
    this.nameFilter = value;
    clearTimeout(this.filterTimer);
    this.filterTimer = setTimeout(() => {
      this.page.set(1);
      void this.fetch();
    }, FILTER_DELAY_MS);
  }

  protected onPage(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    void this.fetch();
  }

  protected rowClicked(row: AutomationRow): void {
    this.clickedRow = row;
  }

  protected openClicked(event: MouseEvent): void {
    const row = this.clickedRow;
    this.clickedRow = null;
    if (!row || !this.canOpen) return;
    const url = this.router.serializeUrl(this.router.createUrlTree([DETAILS_URL, row._id]));
    if (event.ctrlKey) window.open(this.addressBar.prepareExternalUrl(url), '_blank');
    else void this.router.navigateByUrl(url);
  }

  /** Start and Stop show the new status without a notice (STARTSTOP) */
  protected async switchState(row: AutomationRow, active: boolean): Promise<void> {
    const result = await this.communications.switchState(row._id, active);
    if (!result?.success) return;
    this.listed.update(list => list.map(communication => communication._id === row._id ? {...communication, active} : communication));
  }

  /** The confirmation dialog's question first, then the list is read again (AUTODELETE) */
  protected remove(row: AutomationRow): void {
    const data: ConfirmationDialogData = {
      completeMessage: this.i18n.transform('delete_question'),
      excludeQuestionMark: true,
      confirm: 'delete',
      destructive: true,
    };
    this.dialog
      .open<ConfirmationDialogComponent, ConfirmationDialogData, boolean>(ConfirmationDialogComponent, {data})
      .closed.subscribe(async confirmed => {
        if (!confirmed) return;
        await this.communications.deleteCommunication(row._id);
        await this.fetch();
      });
  }

  /** Runs a manual automation at once, without asking, and follows its progress (RUNNOW) */
  protected run(row: AutomationRow): void {
    this.runPromise.set(this.startRun(row._id));
  }

  protected openSchedule(row: AutomationRow): void {
    this.dialog.open<ScheduleDialogComponent, ScheduleDialogData>(ScheduleDialogComponent, {
      data: {communicationId: row._id},
      disableClose: true,
      panelClass: 'app-dialog-panel--xl',
    });
  }

  private openCreate(): void {
    this.dialog
      .open<AutomationCreateDialogComponent, undefined, boolean>(AutomationCreateDialogComponent, {disableClose: true})
      .closed.subscribe(created => {
        if (created) void this.fetch();
      });
  }

  private async fetch(): Promise<void> {
    const request = ++this.request;
    if (!this.pane) this.listingState.save(STATE_KEY, {page: this.page(), name: this.nameFilter} satisfies AutomationListingState);
    const terms = this.nameFilter ? [{property: 'name', fullText: true, language: false, term: this.nameFilter}] : [];
    const result = await this.communications.fetchCommunications(this.page() - 1, PAGE_SIZE, {search: {terms}});
    if (request !== this.request || !result || !('communications' in result)) return;
    const communications = result.communications ?? [];
    this.listed.set(communications);
    this.count.set(result.count ?? 0);
    if (!this.pane) await this.followRunsGoing(communications);
  }

  /** The runs already going when the rows are listed show their progress too (RUNNOW) */
  private async followRunsGoing(communications: Communication[]): Promise<void> {
    const followed = this.runs();
    const going = await Promise.all(communications
      .filter(communication => !followed[communication._id])
      .map(async communication => ({
        id: communication._id,
        queue: (await this.communications.getQueueByParam(communication._id).catch(() => null))?.[0],
      })));
    if (this.destroyed) return;
    this.runs.update(runs => {
      const next = {...runs};
      for (const {id, queue} of going) {
        if (queue && !next[id]) next[id] = {queue: queue._id, progress: queue.progress ?? 0, ended: false};
      }
      return next;
    });
  }

  private async startRun(id: string): Promise<void> {
    const result = await this.communications.sendCommunication(id);
    if (!result?.queue || this.destroyed) return;
    const queue = result.queue;
    this.runs.update(runs => ({...runs, [id]: {queue, progress: 0, ended: false}}));
  }

  /** Reads the progress of the runs followed; one that ended leaves 2 seconds later */
  private async readProgress(): Promise<void> {
    const going = Object.entries(this.runs()).filter(([, run]) => !run.ended);
    if (this.reading || !going.length) return;
    this.reading = true;
    try {
      for (const [id, run] of going) {
        const queue = await this.communications.getQueue(run.queue);
        if (!queue || this.destroyed) continue;
        const ended = !!(queue.done || queue.failed || queue.progress === 100);
        this.runs.update(runs => runs[id]?.queue !== run.queue ? runs : {
          ...runs,
          [id]: {...runs[id], progress: queue.progress || runs[id].progress, ended},
        });
        if (ended) this.unfollowLater(id, run.queue);
      }
    } finally {
      this.reading = false;
    }
  }

  private unfollowLater(id: string, queue: string): void {
    const timer = setTimeout(() => {
      this.endTimers.delete(timer);
      this.runs.update(runs => {
        if (runs[id]?.queue !== queue) return runs;
        const next = {...runs};
        delete next[id];
        return next;
      });
    }, RUN_END_DELAY_MS);
    this.endTimers.add(timer);
  }
}
