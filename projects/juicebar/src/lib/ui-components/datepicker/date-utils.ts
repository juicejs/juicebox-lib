/** Date helpers and value formats for the date and time controls. Days are local days at midnight, as the old ngb helpers made them. */

/** A day as the old ngb datepicker gave it to its form (NgbDateStruct) */
export interface DateStruct {
  year: number;
  month: number;
  day: number;
}

/** A time as the old ngb timepicker gave it to its form (NgbTimeStruct) */
export interface TimeStruct {
  hour: number;
  minute: number;
  second: number;
}

/** A picked range; `to` is the last day of the range */
export interface DateRange<T> {
  from: T;
  to: T;
}

/**
 * What a date control gives its form, after the old juicebox:
 * - `date`: a `Date` at local midnight (deh-forms' NgbDateFormAdapter)
 * - `struct`: `{year, month, day}` (ngb's default, which most old forms sent or converted)
 * - `string`: `'DD.MM.YYYY'` (lottery's NgbDateLotteryAdapter)
 * - `timestamp`: milliseconds at local midnight (the old helpers' ngbDateStructToTimestamp)
 */
export type DateValueFormat = 'date' | 'struct' | 'string' | 'timestamp';

/**
 * What a date and time control gives its form:
 * - `date`: a `Date` (the old datetimepicker)
 * - `iso`: `'YYYY-MM-DDTHH:mm:ss+01:00'`, local time with its offset (the old app-date-and-time-picker)
 * - `timestamp`: milliseconds
 */
export type DateTimeValueFormat = 'date' | 'iso' | 'timestamp';

/** A date given to a control: any shape the old forms used (see `toDate`) */
export type DateInput = Date | DateStruct | string | number | null | undefined;

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Keeps the day where the target month has it, else its last day (31 Jan + 1 month = 28/29 Feb), as ngb did */
export function addMonths(date: Date, months: number): Date {
  const firstOfTarget = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(firstOfTarget.getFullYear(), firstOfTarget.getMonth() + 1, 0).getDate();
  return new Date(firstOfTarget.getFullYear(), firstOfTarget.getMonth(), Math.min(date.getDate(), lastDay));
}

/** Months since year 0, to compare and count months */
export function monthIndex(date: Date): number {
  return date.getFullYear() * 12 + date.getMonth();
}

export function isSameDay(a: Date | null, b: Date | null): boolean {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Day key for `track` and comparisons, e.g. 20261105 */
export function dayKey(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

export function clampDay(date: Date, min: Date | null, max: Date | null): Date {
  if (min && dayKey(date) < dayKey(min)) return startOfDay(min);
  if (max && dayKey(date) > dayKey(max)) return startOfDay(max);
  return date;
}

/** ISO 8601 week number, as ngb's showWeekNumbers with Monday first */
export function isoWeek(date: Date): number {
  // The week's Thursday decides its year
  const thursday = addDays(startOfDay(date), 3 - ((date.getDay() + 6) % 7));
  const daysSinceNewYear = Math.round((thursday.getTime() - new Date(thursday.getFullYear(), 0, 1).getTime()) / 86400000);
  return Math.floor(daysSinceNewYear / 7) + 1;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** DD.MM.YYYY, the format the old juicebox showed and typed */
export function formatDate(date: Date): string {
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}

/** HH:mm, or HH:mm:ss with seconds */
export function formatTime(date: Date, seconds = false): string {
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return seconds ? `${time}:${pad(date.getSeconds())}` : time;
}

/** As the old DateTimeModel.toString(): local time with its offset, e.g. 2026-11-05T14:30:00+01:00 */
export function toIsoWithOffset(date: Date): string {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${formatTime(date, true)}${sign}${pad(hours)}:${pad(minutes)}`;
}

function validDate(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): Date | null {
  const date = new Date(year, month - 1, day, hour, minute, second);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    && date.getHours() === hour && date.getMinutes() === minute && date.getSeconds() === second ? date : null;
}

/**
 * Typed text: DD.MM.YYYY (also with `-` or `/`, the old global DD-MM-YYYY), optionally followed by HH:mm or HH:mm:ss.
 * Days or times that don't exist (31.02., 25:00) are invalid, as with ngb.
 */
export function parseTypedDate(text: string): Date | null {
  const match = /^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(text.trim());
  if (!match) return null;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const [hour, minute, second] = [Number(match[4] ?? 0), Number(match[5] ?? 0), Number(match[6] ?? 0)];
  return validDate(year, month, day, hour, minute, second);
}

/**
 * Reads every date shape the old forms held: a Date, ngb's `{year, month, day}`, a timestamp,
 * a typed DD.MM.YYYY (with or without a time) and ISO strings (a date-only ISO string is a local day).
 */
export function toDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') return Number.isFinite(value) ? new Date(value) : null;
  if (typeof value === 'object') {
    const {year, month, day} = value as Partial<DateStruct>;
    return Number.isInteger(year) && Number.isInteger(month) && Number.isInteger(day) ? validDate(year!, month!, day!) : null;
  }
  if (typeof value !== 'string') return null;
  const text = value.trim();
  const typed = parseTypedDate(text);
  if (typed) return typed;
  const isoDay = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (isoDay) return validDate(Number(isoDay[1]), Number(isoDay[2]), Number(isoDay[3]));
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    const date = new Date(text);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

/** A day in the form's format */
export function toDateValue(date: Date | null, format: DateValueFormat): unknown {
  if (!date) return null;
  switch (format) {
    case 'struct': return {year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate()} satisfies DateStruct;
    case 'string': return formatDate(date);
    case 'timestamp': return date.getTime();
    default: return date;
  }
}

/** A date and time in the form's format */
export function toDateTimeValue(date: Date | null, format: DateTimeValueFormat): unknown {
  if (!date) return null;
  switch (format) {
    case 'iso': return toIsoWithOffset(date);
    case 'timestamp': return date.getTime();
    default: return date;
  }
}

/**
 * A range in the form's format. With `date` and `timestamp` the range runs from the first day's 00:00:00 to the
 * last day's 23:59:59, as the old datepicker-range sent it.
 */
export function toRangeValue(from: Date, to: Date, format: DateValueFormat): DateRange<unknown> {
  const end = format === 'date' || format === 'timestamp' ? endOfDay(to) : to;
  return {from: toDateValue(startOfDay(from), format), to: toDateValue(end, format)};
}
