import { inject, Injectable } from '@angular/core';
import { ISearchTerm, SearchTermType } from '../interfaces/ISearchTerm';
import {CustomValidators} from '../CustomValidators';
import {JuiceboxService} from './Juicebox.service';
import {AutoLanguagePipe, MultiLanguageObject} from '../pipes/auto-language.pipe';

export interface DateFormat {
    year: number,
    month: number,
    day: number,
    hour?: number,
    minute?: number,
    second?: number
}

export interface TimeFormat {
    hour: number;
    minute: number;
    second?: number;
}

export interface TableFilter {
    key: string;
    value: string;
}

export interface TableSort {
    dir: string;
    prop: string;
}

@Injectable({
  providedIn: 'root'
})
export class HelperService {
    private juicebox = inject(JuiceboxService);

    public timeForTimepicker(date: any): TimeFormat {

        if (!date) return null;
        const _date = new Date(date);

        return {
            hour: _date.getHours(),
            minute: _date.getMinutes(),
            second: _date.getSeconds()
        };
    }

    public dateForDatepicker(date: Date): DateFormat {

        if (!date) return null;
        const newDate = new Date(date);

        return {
            year: newDate.getFullYear(),
            month: newDate.getMonth() + 1,
            day: newDate.getDate()
        };
    }

    public fullDateForPicker(date: any): DateFormat {

        if (!date) return null;
        const newDate = new Date(date);

        return {
            year: newDate.getFullYear(),
            month: newDate.getMonth() + 1,
            day: newDate.getDate(),
            hour: newDate.getHours(),
            minute: newDate.getMinutes(),
            second: newDate.getSeconds()
        };
    }

    public toDBDate(datetimeObject: DateFormat, offset?: number) {

        if (!datetimeObject) return null;

        if (typeof datetimeObject === 'string') {
            if (offset) {
                return this.offsetDate(new Date(datetimeObject), offset)
            } else {
                return new Date(datetimeObject)
            }
        }

        let obj = { year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0 };
        for (let key of Object.keys(datetimeObject)) {
            obj.hasOwnProperty(key) ? obj[key] = datetimeObject[key] : null;
        }

        if (offset) {
            return this.offsetDate(new Date(obj.year, obj.month - 1, obj.day, obj.hour, obj.minute, obj.second), offset);
        } else {
            return new Date(obj.year, obj.month - 1, obj.day, obj.hour, obj.minute, obj.second);
        }
    }

    public offsetDate(date: Date, offset: number) {
        date.setDate(date.getDate() + offset);
        return date;
    }

    public addMinutesToDate(date: Date | any = null, minutesAdded: number): Date {
        //removing object reference
        const newDate = new Date(date);
        return new Date(newDate.setMinutes(newDate.getMinutes() + minutesAdded));
    }

    public subtractMinutesFromDate(date: Date | any = null, minutesToSubtract: number): Date {
        //removing object reference
        const newDate = new Date(date);
        return new Date(newDate.setMinutes(newDate.getMinutes() - minutesToSubtract));
    }

    public addMonthsToDate(date: Date | any = null, monthsAdded: any): Date {
        //removing object reference
        const newDate = new Date(date);
        return new Date(newDate.setMonth(newDate.getMonth() + monthsAdded));
    }

    public addDurationToDate(date: Date | any = null, duration: DateFormat): Date {
        //removing object reference
        const newDate = new Date(date);
        //debugger;
        return new Date(newDate.setFullYear(newDate.getFullYear() + duration.year, newDate.getMonth() + duration.month, newDate.getDate() + duration.day));
    }

    public subtractMonthsFromDate(date: Date, months: any): Date {
        // removing object reference
        const newDate = new Date(date);
        return new Date(newDate.setMonth(newDate.getMonth() - months));
    }

    public calculateTotalTimeInMinutes(time: TimeFormat): number {
        return time.hour * 60 + time.minute;
    }

    public calculateTotalTimeFromArrayOfTimes(arrayOfTimes: Array<TimeFormat>): string {
        let minute: number = 0;
        arrayOfTimes.forEach(time => {
            minute += (time.hour * 60) + time.minute;
        });
        // converting minutes to TimeFormat
        const hourAndMinute: TimeFormat = this.convertMinutesToHours(minute);

        // string formatting
        const formattedHour = hourAndMinute.hour.toString().padStart(2, '0');
        const formattedMinute = hourAndMinute.minute.toString().padStart(2, '0');

        return formattedHour + ':' + formattedMinute;
    }

    public setDateToBeginningOfTheDay(date: Date | any): Date {
        if (!date) return null;

        // Midnight of that day, in the browser's time zone
        const day = new Date(date);
        day.setHours(0, 0, 0, 0);
        return day;
    }

    public convertMinutesToHours(m: number): TimeFormat {
        const hour = (m / 60);
        const rHour = Math.floor(hour);
        const minute = (hour - rHour) * 60;
        const rMinute = Math.round(minute);
        return { hour: rHour, minute: rMinute };
    }

    /**
     * The years, months and days from one date to the other, counted as moment's duration counted them: whole days
     * first, then months of 146097 / 4800 days (30.44), then years of 12 months. Later than earlier gives negatives.
     */
    public calculateTotalTimeDate(dateFrom: Date, dateTo: Date): DateFormat {
        const milliseconds = momentTime(dateTo) - momentTime(dateFrom);
        if (!Number.isFinite(milliseconds)) return {year: NaN, month: NaN, day: NaN};

        // Towards zero, as moment rounds
        const absFloor = (n: number) => n < 0 ? Math.ceil(n) || 0 : Math.floor(n);
        const absCeil = (n: number) => n < 0 ? Math.floor(n) : Math.ceil(n);
        const hours = absFloor(absFloor(absFloor(milliseconds / 1000) / 60) / 60);
        const allDays = absFloor(hours / 24);
        const allMonths = absFloor(allDays * 4800 / 146097);
        return {
            year: absFloor(allMonths / 12),
            month: allMonths % 12,
            day: allDays - absCeil(allMonths * 146097 / 4800),
        };
    }
    public pause() {
        return new Promise((resolve) => {setTimeout(resolve, 200)});
    }

    /**
     * Returns filter array which is ready for a fetch query
     * @param filter - current filters array
     * @param property - column property to be filtered
     * @param value - value of the filtered column
     *
     * @Returns {filter: Array<TableFilter>, resolved: boolean}
     * resolved true means this filter was not changed and the fetch is not necessary
     */
    prepareFilter(filter: Array<TableFilter>, property: string, value: any): { filter: Array<TableFilter>, resolved: boolean } {
        const index = filter.findIndex(filter => filter.key === property);
        if (!value && index < 0) {
            return {
                filter: filter,
                resolved: true,
            };
        }
        if (!value && (index !== -1 && index !== undefined)) {
            filter.splice(index, 1);
        } else {
            if (index === -1) {
                filter.push({
                    key: property,
                    value: value
                });
            } else {
                filter[index].key = property;
                filter[index].value = value;
            }
        }
        return {
            filter: filter,
            resolved: false
        };
    }

    prepareSearchTerm(filter: Array<ISearchTerm>, property: string, term: string, language?: string, type?: SearchTermType): { filter: Array<ISearchTerm>, resolved: boolean } {
        const index = filter.findIndex(f => f.property === property);
        if (!term && index < 0) {
            return {
                filter: filter,
                resolved: true,
            };
        }
        if (!term && (index !== -1 && index !== undefined)) {
            filter.splice(index, 1);
        } else {
            if (index === -1) {
                filter.push({
                    property: property,
                    term: term,
                    fullText: true,
                    language: language ? language : false,
                    type: type,
                    languages: type === 'multilang' ? this.juicebox.getAllSystemLanguages() : null
                });
            } else {
                filter[index].property = property;
                filter[index].term = term;
            }
        }

        return {
            filter: filter,
            resolved: false
        };
    }

    /**
     * Return a full date string: "DD.MM.YYYY HH:mm"
     * @param date
     * @param time
     */
    // getFullDateString(date: NgbDateStruct, time: NgbTimeStruct): string {
    //
    //     let day =  'DD';
    //     let month = 'MM';
    //     let year = 'YYYY';
    //     let hour = 'HH';
    //     let minute = 'mm';
    //
    //     if (date) {
    //         day = isNumber(date.day) ? padNumber(date.day) : 'DD';
    //         month = isNumber(date.month) ? padNumber(date.month) : 'MM';
    //         year = isNumber(date.year) ? date.year.toString() : 'YYYY';
    //     }
    //
    //     if (time) {
    //         hour = isNumber(time.hour) ? padNumber(time.hour) : 'HH';
    //         minute = isNumber(time.minute) ? padNumber(time.minute) : 'mm';
    //     }
    //
    //     return `${ day }.${ month }.${ year } ${ hour }:${ minute }`;
    // }
    //
    // getDateString(date: NgbDateStruct): string {
    //
    //     let day =  'DD';
    //     let month = 'MM';
    //     let year = 'YYYY';
    //
    //     if (date) {
    //         day = isNumber(date.day) ? padNumber(date.day) : 'DD';
    //         month = isNumber(date.month) ? padNumber(date.month) : 'MM';
    //         year = isNumber(date.year) ? date.year.toString() : 'YYYY';
    //     }
    //
    //
    //     return `${ day }.${ month }.${ year }`;
    // }
    //
    //
    // ngbDateStructToTimestamp(data: NgbDateStruct): number {
    //     return new Date(data.year, data.month - 1, data.day).getTime();
    // }
    //
    // getNgbDatepickerFormatFromTimestamp(timestamp: number): NgbDateStruct {
    //     const date: Date = new Date(timestamp);
    //     return {
    //         day: date.getDate(),
    //         month: date.getMonth() + 1,
    //         year: date.getFullYear()
    //     }
    // }
    //
    // showTimeFromTimepicker(time: TimeFormat) {
    //     const hour = time.hour < 10 ? `0${ time.hour }` : time.hour;
    //     const minute = time.minute < 10 ? `0${ time.minute }` : time.minute;
    //     return `${ hour }:${ minute }`;
    // }

    arrayContainsValue(values: Array<any>, value: string, language?: string): boolean {
        if (!values || !values.length || !value) return false;
        language = language ? language : this.juicebox.getLanguage();

        let valueExists: boolean = false;
        values.forEach(v => {
            if (valueExists) return;
            if (typeof v === 'object') {
                if (v[language] === value) {
                    valueExists = true;
                }
            } else {
                if (v == value) {
                    valueExists = true;
                    return;
                }
            }
        })

        return valueExists;
    }

    /**
     * A password as the default CustomValidators.passwordGeneratorRegex describes it: 12 to 16 letters and digits,
     * with at least one lower-case letter, one capital and one digit (which also passes passwordValidatorRegex). From
     * the browser's cryptographic random numbers; tries again while one of the three kinds is missing.
     */
    public generateRandomPassword(): string {
        const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        for (let i = 0; i < 100; i++) {
            const bytes = crypto.getRandomValues(new Uint8Array(64));
            let next = 0;
            // A whole number below n from the next byte below the last whole multiple of n, so no number is likelier
            // than another; NaN once the bytes run out, which only shortens the try and the regex then judges it
            const random = (n: number): number => {
                const limit = 256 - (256 % n);
                while (next < bytes.length && bytes[next] >= limit) next++;
                return next < bytes.length ? bytes[next++] % n : NaN;
            };
            const length = 12 + random(5);
            const pass = Array.from({length}, () => characters[random(characters.length)] ?? '').join('');
            if (CustomValidators.passwordGeneratorRegex.test(pass)) return pass;
        }

        return null;
    }

    /**
     * Searches for a string (term) by the key (termKey) in the array of objects (source) and returns the property (property)
     * @param term
     * @param source
     * @param termKey
     * @param property
     */
    public searchValue(term: string, source: Array<{[key: string]: any}>, termKey: string = '_id', property: string = 'name'): string {
        try {
            return source.find(item => item[termKey] === term)[property]
        } catch (e) {
            return '';
        }
    }

    /**
     * Helper for multiple promise buttons in 1 table row
     * @param rows
     */
    getPromiseButtonObject(rows: number = 10) {
        const promiseButtonObject = {};
        for (let i = 0; i < rows; i++) {
            promiseButtonObject[i] = false;
        }
        return {...promiseButtonObject};
    }


    customDropdownSearchForLocalisedObject(term: string, item: MultiLanguageObject, localisationOrder?: string[]) {
        const language = this.juicebox.getLanguage();
        let localisedValue: string;
        if (item[language]) {
            localisedValue = <string>item[language];
        }  else {
            const autoLanguagePipe = new AutoLanguagePipe(this.juicebox);
            if (!localisationOrder?.length) {
                localisedValue = autoLanguagePipe.transform(item);
            } else {
                localisedValue = autoLanguagePipe.transform(item, language, localisationOrder);
            }
        }

        return !!localisedValue.toLowerCase().includes(term.toLowerCase());
    }

}

type DateUnit = 'year' | 'month' | 'date' | 'day' | 'hour' | 'minute' | 'second' | 'millisecond';

const UNIT_ALIASES: Record<string, DateUnit> = {
    y: 'year', year: 'year', years: 'year',
    M: 'month', month: 'month', months: 'month',
    D: 'date', date: 'date', dates: 'date',
    d: 'day', day: 'day', days: 'day',
    h: 'hour', hour: 'hour', hours: 'hour',
    m: 'minute', minute: 'minute', minutes: 'minute',
    s: 'second', second: 'second', seconds: 'second',
    ms: 'millisecond', millisecond: 'millisecond', milliseconds: 'millisecond',
};

/**
 * The time of a date as moment(value) read it, which calculateTotalTimeDate used to take its dates through: nothing
 * is now, null is no date; a date-only ISO text ("2026-03-01", "2026-03", "2026") is midnight in the browser's time
 * zone, not UTC as new Date() reads it; an array [year, month, day, hour, minute, second, ms] and an object
 * {year, month, day (or date), hour, …} have a month from 0. NaN for what isn't a date.
 */
function momentTime(value: unknown): number {
    if (value === undefined) return Date.now();
    if (value === null) return NaN;
    if (value instanceof Date || typeof value === 'number') return new Date(value).getTime();
    if (typeof value === 'string') {
        const dateOnly = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value.trim());
        if (!dateOnly) return new Date(value).getTime();
        const [, year, month, day] = dateOnly;
        return localTime([+year, month === undefined ? undefined : +month - 1, day === undefined ? undefined : +day]);
    }
    if (Array.isArray(value)) return localTime(value);
    if (typeof value === 'object') {
        const units: Partial<Record<DateUnit, number>> = {};
        for (const [key, unit] of Object.entries(value)) {
            // As moment: the short names as written (M is month, m minute), the long ones in any case
            const name = [key, key.toLowerCase()].filter(alias => Object.hasOwn(UNIT_ALIASES, alias)).map(alias => UNIT_ALIASES[alias])[0];
            if (name) units[name] = Number(unit);
        }
        return localTime([units.year, units.month, units.day ?? units.date, units.hour, units.minute, units.second, units.millisecond]);
    }
    return NaN;
}

/**
 * A local time from its parts, as moment built one: missing leading parts of the date are today's, the rest start at
 * their lowest (day 1, hour 0, …); a part out of its range (month 12, day 31 of April, minute 60) is no date, and
 * 24:00:00.000 is the next day's midnight.
 */
function localTime(parts: Array<number | undefined>): number {
    const now = new Date();
    const today = [now.getFullYear(), now.getMonth(), now.getDate()];
    const values = Array.from({length: 7}, (_, index) => parts[index]);
    let index = 0;
    for (; index < 3 && values[index] == null; index++) values[index] = today[index];
    for (; index < 7; index++) if (values[index] == null) values[index] = index === 2 ? 1 : 0;
    const [year, month, day, hour, minute, second, millisecond] = values as number[];

    // setFullYear, so years below 100 stay themselves (new Date(25, 0) is 1925)
    const lastOfMonth = new Date(0);
    lastOfMonth.setFullYear(year, month + 1, 0);
    const endOfDay = hour === 24 && minute === 0 && second === 0 && millisecond === 0;
    const inRange = month >= 0 && month <= 11 && day >= 1 && day <= lastOfMonth.getDate()
        && (endOfDay || hour >= 0 && hour <= 23) && minute >= 0 && minute <= 59
        && second >= 0 && second <= 59 && millisecond >= 0 && millisecond <= 999;
    if (!inRange) return NaN;

    const date = new Date(0);
    date.setFullYear(year, month, day);
    date.setHours(hour, minute, second, millisecond);
    return date.getTime();
}
