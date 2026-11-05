import {
  Component, ElementRef, Injector, OnInit, TemplateRef, afterNextRender, computed, forwardRef, inject, input, linkedSignal,
  output, signal,
} from '@angular/core';
import {NgTemplateOutlet} from '@angular/common';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {CustomMaterialDateAdapter} from '../../core/shared/services/CustomDatepickerI18n';
import {DISABLEABLE, Disableable} from '../disableable';
import {
  DateInput, DateRange, DateValueFormat, addDays, addMonths, clampDay, dayKey, isSameDay, isoWeek, monthIndex, startOfDay,
  startOfMonth, toDate, toDateValue, toRangeValue,
} from './date-utils';

export type CalendarSelectionMode = 'single' | 'range';
export type CalendarOutsideDays = 'visible' | 'hidden';

/** What a `dayTemplate` gets for each day, after ngb's DayTemplateContext */
export interface CalendarDayContext {
  $implicit: Date;
  date: Date;
  /** The day of the month, as ngb's `date.day` */
  day: number;
  /** The month (1-12) of the grid the day is shown in */
  currentMonth: number;
  outside: boolean;
  disabled: boolean;
  focused: boolean;
  selected: boolean;
  today: boolean;
  rangeStart: boolean;
  rangeEnd: boolean;
  /** Between the range's first and last day, or up to the hovered day while the last one is being picked */
  inRange: boolean;
}

interface CalendarDay {
  key: number;
  hidden: boolean;
  ariaLabel: string;
  /** The range band runs under the day, from its middle on the first day and up to it on the last */
  band: boolean;
  bandStart: boolean;
  bandEnd: boolean;
  context: CalendarDayContext;
}

interface CalendarMonth {
  key: number;
  title: string;
  /** `number` is empty for a week whose days are all hidden */
  weeks: { key: number; number: string; days: CalendarDay[] }[];
}

interface CalendarCell {
  value: number;
  label: string;
  disabled?: boolean;
  selected: boolean;
  current: boolean;
}

/** The day the keyboard is on and the first month shown */
interface CalendarPosition {
  focused: Date;
  first: Date;
}

type CalendarMode = 'days' | 'years' | 'months';

/** Weeks shown per month, as ngb did, so the calendar keeps its height */
const WEEKS_PER_MONTH = 6;

/**
 * A calendar, after the old ngb datepicker: Monday first, the juicebox language's day and month names, the month and year
 * picked from the header, the old keyboard keys, `minDate`/`maxDate`, `markDisabled`, `displayMonths`, `outsideDays`,
 * `showWeekNumbers`, a `dayTemplate` and `dateSelect`. In `range` mode it picks a range as the old range pickers did.
 *
 * Inline (`<ngb-datepicker>`) it is a form control: the day in `valueFormat`, or `{from, to}` in range mode.
 * app-datepicker and the other fields show it in their panel and drive it through `selected` and `range`.
 */
@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
  imports: [NgTemplateOutlet],
  host: {
    'class': 'app-calendar',
    '[class.app-calendar-disabled]': 'isDisabled()',
  },
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => CalendarComponent),
    multi: true,
  }, {
    provide: DISABLEABLE,
    useExisting: forwardRef(() => CalendarComponent),
  }],
})
export class CalendarComponent implements OnInit, ControlValueAccessor, Disableable {
  selectionMode = input<CalendarSelectionMode>('single');
  /** The form value's shape, see `DateValueFormat`; by default ngb's `{year, month, day}`, as the old forms sent it */
  valueFormat = input<DateValueFormat>('struct');
  minDate = input<DateInput>(null);
  maxDate = input<DateInput>(null);
  /** The month shown while there is no date (ngb's startDate) */
  startDate = input<DateInput>(null);
  /** Days that can't be picked (ngb's markDisabled) */
  markDisabled = input<((date: Date) => boolean) | null>(null);
  /** Months shown side by side (ngb's displayMonths) */
  displayMonths = input(1);
  /** `hidden` leaves the other months' days out of each month (ngb's outsideDays) */
  outsideDays = input<CalendarOutsideDays>('visible');
  showWeekNumbers = input(false);
  /** Draws each day (ngb's dayTemplate); the day button around it still picks the day */
  dayTemplate = input<TemplateRef<CalendarDayContext> | null>(null);
  /** The picked day, for a field that shows the calendar in its panel; forms use the control value instead */
  selected = input<DateInput>(null);
  /** The picked range, likewise */
  range = input<DateRange<DateInput> | null>(null);
  /** Puts the keyboard on the calendar when it is shown, as ngb's popup did */
  autoFocus = input(false);

  /** A day was clicked or chosen with the keyboard (ngb's dateSelect) */
  dateSelect = output<Date>();
  /** Range mode: the last day of a range was picked */
  rangeSelect = output<DateRange<Date>>();

  private readonly names = inject(CustomMaterialDateAdapter);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly weekdays = this.names.getDayOfWeekNames('short');
  private readonly monthNames = this.names.getMonthNames('short');
  private readonly today = startOfDay(new Date());

  private readonly selectedDay = linkedSignal(() => toDate(this.selected()));
  private readonly rangeFrom = linkedSignal(() => toDate(this.range()?.from));
  private readonly rangeTo = linkedSignal(() => toDate(this.range()?.to));
  /** The day under the mouse, for the range preview */
  protected readonly hovered = signal<Date | null>(null);

  private readonly formDisabled = signal(false);
  private readonly externallyDisabled = signal(false);
  protected readonly isDisabled = computed(() => this.formDisabled() || this.externallyDisabled());

  private readonly min = computed(() => toDate(this.minDate()));
  private readonly max = computed(() => toDate(this.maxDate()));
  private readonly monthCount = computed(() => Math.max(1, this.displayMonths()));

  protected readonly mode = signal<CalendarMode>('days');

  /** Follows the picked day; the months shown stay put while it is one of them */
  protected readonly position = linkedSignal<Date, CalendarPosition>({
    source: () => clampDay(
      startOfDay(this.selectedDay() ?? this.rangeFrom() ?? toDate(this.startDate()) ?? this.today), this.min(), this.max(),
    ),
    computation: (focused, previous) => ({
      focused,
      first: previous ? this.firstShowing(previous.value.first, focused) : startOfMonth(focused),
    }),
  });
  /** The year shown in the months view, picked in the years view */
  private readonly pickedYear = linkedSignal(() => this.position().first.getFullYear());

  protected readonly title = computed(() => this.monthTitle(this.position().first));
  protected readonly monthsTitle = computed(() => `${this.pickedYear()}`);
  protected readonly showMonthTitles = computed(() => this.monthCount() > 1);

  protected readonly prevDisabled = computed(() => {
    const min = this.min();
    return this.isDisabled() || (!!min && monthIndex(min) >= monthIndex(this.position().first));
  });
  protected readonly nextDisabled = computed(() => {
    const max = this.max();
    return this.isDisabled() || (!!max && monthIndex(max) <= monthIndex(this.position().first) + this.monthCount() - 1);
  });

  protected readonly months = computed<CalendarMonth[]>(() => {
    const {first, focused} = this.position();
    const isRange = this.selectionMode() === 'range';
    const selected = isRange ? null : this.selectedDay();
    const from = isRange ? this.rangeFrom() : null;
    const to = isRange ? this.rangeTo() : null;
    const hovered = this.hovered();
    const fromKey = from ? dayKey(from) : null;
    // The range's last day, or the hovered day while it is being picked
    const endKey = to ? dayKey(to) : (fromKey !== null && hovered && dayKey(hovered) > fromKey ? dayKey(hovered) : null);
    const markDisabled = this.markDisabled();
    const hideOutside = this.outsideDays() === 'hidden';
    const disabledAll = this.isDisabled();
    // A dayTemplate draws the range itself
    const drawBand = !this.dayTemplate();

    const months: CalendarMonth[] = [];
    for (let i = 0; i < this.monthCount(); i++) {
      const monthStart = addMonths(first, i);
      // Monday first: getDay() is 0 for Sunday
      const gridStart = addDays(monthStart, -((monthStart.getDay() + 6) % 7));
      const weeks: CalendarMonth['weeks'] = [];
      for (let week = 0; week < WEEKS_PER_MONTH; week++) {
        const days: CalendarDay[] = [];
        for (let weekday = 0; weekday < 7; weekday++) {
          const date = addDays(gridStart, week * 7 + weekday);
          const key = dayKey(date);
          const outside = date.getMonth() !== monthStart.getMonth();
          const inRange = fromKey !== null && endKey !== null && key > fromKey && (to ? key < endKey : key <= endKey);
          const hidden = outside && hideOutside;
          days.push({
            key,
            hidden,
            band: drawBand && !hidden && inRange,
            bandStart: drawBand && !hidden && key === fromKey && endKey !== null,
            bandEnd: drawBand && !hidden && !!to && key === endKey,
            ariaLabel: `${date.getDate()}. ${this.monthNames[date.getMonth()]} ${date.getFullYear()}`,
            context: {
              $implicit: date,
              date,
              day: date.getDate(),
              currentMonth: monthStart.getMonth() + 1,
              outside,
              disabled: disabledAll || this.outOfRange(key) || !!markDisabled?.(date),
              // A day shown twice (an outside day of the neighbouring month) takes the focus only in its own month
              focused: !outside && isSameDay(date, focused),
              selected: isSameDay(date, selected),
              today: isSameDay(date, this.today),
              rangeStart: key === fromKey,
              rangeEnd: !!to && key === endKey,
              inRange,
            },
          });
        }
        weeks.push({key: days[0].key, number: days.every(d => d.hidden) ? '' : `${isoWeek(days[0].context.date)}`, days});
      }
      months.push({key: dayKey(monthStart), title: this.monthTitle(monthStart), weeks});
    }
    return months;
  });

  /** As ngb's year select: 10 years either side of the shown one, or up to minDate/maxDate when they are set */
  protected readonly years = computed<CalendarCell[]>(() => {
    const shown = this.pickedYear();
    const min = this.min();
    const max = this.max();
    const start = min ? Math.max(min.getFullYear(), shown - 500) : shown - 10;
    const end = max ? Math.min(max.getFullYear(), shown + 500) : shown + 10;
    const selectedYear = (this.selectedDay() ?? this.rangeFrom())?.getFullYear();
    const years: CalendarCell[] = [];
    for (let year = start; year <= end; year++) {
      years.push({value: year, label: `${year}`, selected: year === selectedYear, current: year === shown});
    }
    return years;
  });

  protected readonly monthCells = computed<CalendarCell[]>(() => {
    const year = this.pickedYear();
    const selected = this.selectedDay() ?? this.rangeFrom();
    const first = this.position().first;
    const min = this.min();
    const max = this.max();
    return this.monthNames.map((label, month) => ({
      value: month,
      label,
      // The whole month lies before minDate or after maxDate
      disabled: (!!min && dayKey(new Date(year, month + 1, 0)) < dayKey(min)) || (!!max && dayKey(new Date(year, month, 1)) > dayKey(max)),
      selected: !!selected && selected.getFullYear() === year && selected.getMonth() === month,
      current: first.getFullYear() === year && first.getMonth() === month,
    }));
  });

  private onChange: (value: unknown) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnInit(): void {
    if (this.autoFocus()) this.focusDayAfterRender();
  }

  protected choose(day: CalendarDay): void {
    const {date, disabled} = day.context;
    if (disabled) return;
    this.position.update(position => ({focused: date, first: this.firstShowing(position.first, date)}));
    if (this.selectionMode() === 'range') {
      this.pickRange(date);
    } else {
      this.selectedDay.set(date);
      this.onChange(toDateValue(date, this.valueFormat()));
    }
    this.onTouched();
    this.dateSelect.emit(date);
  }

  /** As the old range pickers: the first click starts a range, a later day ends it, any other click starts again */
  private pickRange(date: Date): void {
    const from = this.rangeFrom();
    if (from && !this.rangeTo() && dayKey(date) > dayKey(from)) {
      this.rangeTo.set(date);
      this.hovered.set(null);
      this.onChange(toRangeValue(from, date, this.valueFormat()));
      this.rangeSelect.emit({from, to: date});
    } else {
      this.rangeFrom.set(date);
      this.rangeTo.set(null);
    }
  }

  protected hover(day: CalendarDay): void {
    if (this.selectionMode() === 'range' && this.rangeFrom() && !this.rangeTo()) this.hovered.set(day.context.date);
  }

  protected showMonth(step: 1 | -1): void {
    this.position.update(({focused, first}) => ({
      first: addMonths(first, step),
      focused: clampDay(addMonths(focused, step), this.min(), this.max()),
    }));
  }

  protected toggleYearsView(): void {
    if (this.mode() === 'days') {
      this.pickedYear.set(this.position().first.getFullYear());
      this.mode.set('years');
      afterNextRender(() => this.currentYearInView(), {injector: this.injector});
    } else {
      this.mode.set('days');
      this.focusDayAfterRender();
    }
  }

  protected pickYear(year: number): void {
    this.pickedYear.set(year);
    this.mode.set('months');
  }

  protected pickMonth(cell: CalendarCell): void {
    if (cell.disabled) return;
    const year = this.pickedYear();
    const lastDay = new Date(year, cell.value + 1, 0).getDate();
    const focused = clampDay(new Date(year, cell.value, Math.min(this.position().focused.getDate(), lastDay)), this.min(), this.max());
    this.position.set({focused, first: new Date(year, cell.value, 1)});
    this.mode.set('days');
    this.focusDayAfterRender();
  }

  /**
   * ngb's keys: arrows by day and week, PageUp/PageDown by month (with Shift by year), Home/End to the first and last day
   * shown (with Shift to minDate/maxDate). Enter and Space pick the day, as its button does.
   */
  protected onDaysKeydown(event: KeyboardEvent): void {
    const {focused, first} = this.position();
    let next: Date | null = null;
    switch (event.key) {
      case 'ArrowLeft': next = addDays(focused, -1); break;
      case 'ArrowRight': next = addDays(focused, 1); break;
      case 'ArrowUp': next = addDays(focused, -7); break;
      case 'ArrowDown': next = addDays(focused, 7); break;
      case 'PageUp': next = addMonths(focused, event.shiftKey ? -12 : -1); break;
      case 'PageDown': next = addMonths(focused, event.shiftKey ? 12 : 1); break;
      case 'Home': next = event.shiftKey ? this.min() : first; break;
      case 'End': next = event.shiftKey ? this.max() : new Date(first.getFullYear(), first.getMonth() + this.monthCount(), 0); break;
      default: return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (!next) return;
    const target = clampDay(startOfDay(next), this.min(), this.max());
    this.position.update(position => ({focused: target, first: this.firstShowing(position.first, target)}));
    this.focusDayAfterRender();
  }

  /** The first month to show so that `focused` is one of the months shown, moving as little as possible */
  private firstShowing(first: Date, focused: Date): Date {
    const count = this.monthCount();
    if (monthIndex(focused) < monthIndex(first)) return startOfMonth(focused);
    if (monthIndex(focused) > monthIndex(first) + count - 1) return new Date(focused.getFullYear(), focused.getMonth() - count + 1, 1);
    return first;
  }

  private monthTitle(date: Date): string {
    return `${this.monthNames[date.getMonth()]} ${date.getFullYear()}`;
  }

  private outOfRange(key: number): boolean {
    const min = this.min();
    const max = this.max();
    return (!!min && key < dayKey(min)) || (!!max && key > dayKey(max));
  }

  private focusDayAfterRender(): void {
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>('.app-calendar-day[tabindex="0"]')?.focus(),
      {injector: this.injector},
    );
  }

  /** Scrolls only the years list (scrollIntoView would also scroll the page behind a panel) */
  private currentYearInView(): void {
    const list = this.host.nativeElement.querySelector<HTMLElement>('.app-calendar-years');
    const current = list?.querySelector<HTMLElement>('.app-calendar-cell-current');
    if (list && current) list.scrollTop = current.offsetTop - (list.clientHeight - current.offsetHeight) / 2;
  }

  writeValue(value: unknown): void {
    if (this.selectionMode() === 'range') {
      const range = value as Partial<DateRange<unknown>> | null;
      this.rangeFrom.set(toDate(range?.from));
      this.rangeTo.set(toDate(range?.to));
    } else {
      this.selectedDay.set(toDate(value));
    }
  }

  registerOnChange(fn: (value: unknown) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.formDisabled.set(disabled); }
  setExternallyDisabled(disabled: boolean): void { this.externallyDisabled.set(disabled); }
}
