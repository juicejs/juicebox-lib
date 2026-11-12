import {Component, inject, OnInit, signal} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {DIALOG_DATA} from '@angular/cdk/dialog';
import {
  ButtonComponent,
  CalendarComponent,
  DateStruct,
  DialogContentComponent,
  DialogTitleComponent,
  TimepickerComponent,
  TimeStruct,
} from '../../../../../ui-components';
import {PromiseButtonDirective} from '../../../../shared/directives/PromiseButton';
import {CommunicationsService} from '../../communications.service';
import {Communication} from '../../communications.types';
import {CommunicationsTranslationPipe} from '../../i18n/communications.translation';
import {PendingTimesComponent} from '../pending-times/pending-times.component';
import {StartedTimesComponent} from '../started-times/started-times.component';

export interface ScheduleDialogData {
  communicationId: string;
}

/**
 * "Schedule communication" (ScheduleDialog): a date and a time, set to the present moment, with Schedule; beside them
 * the automation's pending times and the runs its scheduled times started. It closes only with its close button.
 */
@Component({
  selector: 'app-schedule-dialog',
  templateUrl: './schedule-dialog.component.html',
  styleUrl: './schedule-dialog.component.scss',
  imports: [
    ReactiveFormsModule,
    DialogTitleComponent,
    DialogContentComponent,
    CalendarComponent,
    TimepickerComponent,
    ButtonComponent,
    PromiseButtonDirective,
    PendingTimesComponent,
    StartedTimesComponent,
    CommunicationsTranslationPipe,
  ],
  providers: [CommunicationsTranslationPipe],
})
export class ScheduleDialogComponent implements OnInit {
  private readonly communications = inject(CommunicationsService);
  private readonly data = inject<ScheduleDialogData>(DIALOG_DATA);

  private readonly now = new Date();
  protected readonly date = new FormControl<DateStruct | null>({
    year: this.now.getFullYear(),
    month: this.now.getMonth() + 1,
    day: this.now.getDate(),
  });
  protected readonly time = new FormControl<TimeStruct | null>({hour: this.now.getHours(), minute: this.now.getMinutes(), second: 0});
  /** The automation as read last; the lists read their times from it */
  protected readonly communication = signal<Communication | null>(null);
  protected readonly schedulePromise = signal<Promise<unknown> | null>(null);

  ngOnInit(): void {
    void this.load();
  }

  /**
   * Adds the date and time, in the staff member's local time, to the pending times, without a notice. The automation
   * is read again at once, so a time added may show only when the dialog is opened again (SCHEDADD).
   */
  protected schedule(): void {
    const date = this.date.value;
    const time = this.time.value;
    if (!date || !time) return;
    const at = new Date(date.year, date.month - 1, date.day, time.hour, time.minute);
    this.schedulePromise.set(this.communications.scheduleCommunication(this.data.communicationId, at));
    void this.load();
  }

  private async load(): Promise<void> {
    this.communication.set(await this.communications.getCommunication(this.data.communicationId));
  }
}
