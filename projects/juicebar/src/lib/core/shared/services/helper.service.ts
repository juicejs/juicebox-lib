import { Injectable } from '@angular/core';
import { ISearchTerm, SearchTermType } from '../interfaces/ISearchTerm';
// import { NgbDateStruct, NgbTimeStruct } from '@ng-bootstrap/ng-bootstrap';
// import { isNumber, padNumber } from '../app/shared/ngb-datepicker-adapters/util';
import RandExp from "randexp";
import {CustomValidators} from '../CustomValidators';
import {JuiceboxService} from './Juicebox.service';
import moment from 'moment';
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

    constructor(private juicebox: JuiceboxService) {}

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

        const newMoment = moment(new Date(date));
        return newMoment.startOf('day').toDate();
    }

    public convertMinutesToHours(m: number): TimeFormat {
        const hour = (m / 60);
        const rHour = Math.floor(hour);
        const minute = (hour - rHour) * 60;
        const rMinute = Math.round(minute);
        return { hour: rHour, minute: rMinute };
    }

    public calculateTotalTimeDate(dateFrom: Date, dateTo: Date): DateFormat {
        // calculate in days and hours
        const duration = moment.duration(moment(dateTo).diff(moment(dateFrom)));
        return { year: duration.years(), month: duration.months(), day: duration.days()};
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
     * Returns a string generated by the regex rule.
     * Iterations used since there is ~19% chance of generating a faulty string
     */
    public generateRandomPassword(): string {
        for (let i = 0; i < 100; i++) {
            const pass = new RandExp(CustomValidators.passwordGeneratorRegex).gen();
            if (CustomValidators.passwordValidatorRegex.test(pass)) return pass;
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
