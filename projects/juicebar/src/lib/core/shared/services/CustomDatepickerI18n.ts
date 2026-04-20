import {Injectable} from '@angular/core';
import {MatDateFormats, DateAdapter, NativeDateAdapter} from '@angular/material/core';
import {JuiceboxService} from './Juicebox.service';

const I18N_VALUES = {
    'en_GB': {
        weekdays: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
        months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    },
    'de_DE': {
        weekdays: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
        months: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
    },
    'cs_CZ': {
        weekdays: ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'],
        months: ['Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čvn', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro']
    },
    'sk_SK': {
        weekdays: ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'],
        months: ['Jan', 'Feb', 'Mar', 'Apr', 'Máj', 'Jún', 'Júl', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']
    },
    'da_DK': {
        weekdays: ['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'],
        months: ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']
    },
    'hr_HR': {
        weekdays: ['Po', 'Ut', 'Sr', 'Če', 'Pe', 'Su', 'Ne'],
        months: ['Sij', 'Velj', 'Ožu', 'Tra', 'Svi', 'Lip', 'Srp', 'Kol', 'Ruj', 'Lis', 'Stu', 'Pro']
    },
    'ru_RU': {
        weekdays: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
        months: ['Янв.', 'Фев.', 'Мар.', 'Апр.', 'Май', 'Июн.', 'Июл.', 'Авг.', 'Сен.', 'Окт.', 'Ноя.', 'Дек.']
    },
    'sv_SE': {
        weekdays: ['Mån', 'Tis', 'Ons', 'Tors', 'Fre', 'Lör', 'Sön'],
        months: ['Jan.', 'Febr.', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dec.']
    },
    'fi_FI': {
        weekdays: ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'],
        months: ['tammik.', 'helmik.', 'maalisk.', 'huhtik.', 'toukok.', 'kesäk.', 'heinäk.', 'elok.', 'syysk.', 'lokak.', 'marrask.', 'jouluk.']
    }
};

/**
 * Custom Material DateAdapter that supports internationalization and DD.MM.YYYY format
 * Replaces the NgBootstrap CustomDatepickerI18n functionality
 */
@Injectable({providedIn: 'root'})
export class CustomMaterialDateAdapter extends NativeDateAdapter {
    private language: string;

    constructor(matDateLocale: string, private juicebox: JuiceboxService) {
        super(matDateLocale);
        this.language = this.juicebox.getLanguage();
    }

  override getMonthNames(style: 'long' | 'short' | 'narrow'): string[] {
        return I18N_VALUES[this.language]?.months || I18N_VALUES['en_GB'].months;
    }

  override getDayOfWeekNames(style: 'long' | 'short' | 'narrow'): string[] {
        return I18N_VALUES[this.language]?.weekdays || I18N_VALUES['en_GB'].weekdays;
    }

  override format(date: Date, displayFormat: string): string {
        if (!this.isValid(date)) {
            return '';
        }

        // Custom DD.MM.YYYY format
        if (displayFormat === 'DD.MM.YYYY' || displayFormat === 'input') {
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${day}.${month}.${year}`;
        }

        return super.format(date, displayFormat);
    }

  override parse(value: any): Date | null {
        if (typeof value === 'string' && value.length > 0) {
            // Handle DD.MM.YYYY format
            const dateParts = value.trim().split('.');
            if (dateParts.length === 3) {
                const day = parseInt(dateParts[0], 10);
                const month = parseInt(dateParts[1], 10);
                const year = parseInt(dateParts[2], 10);

                if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                    const date = new Date(year, month - 1, day);
                    return this.isValid(date) ? date : null;
                }
            }
        }

        return super.parse(value);
    }

    /**
     * Static utility method to parse various date formats used throughout the application.
     * Can be used by any component that needs to convert date strings to Date objects.
     */
    static parseAppDateValue(value: any): Date | null {
        if (!value) {
            return null;
        }

        // If already a Date object, return it
        if (value instanceof Date) {
            return isNaN(value.getTime()) ? null : value;
        }

        // Handle object format {year, month, day}
        if (typeof value === 'object' && value.year && value.month && value.day) {
            const date = new Date(value.year, value.month - 1, value.day); // month is 0-indexed in Date
            return isNaN(date.getTime()) ? null : date;
        }

        if (typeof value !== 'string') {
            return null;
        }

        const stringValue = value.trim();
        if (!stringValue) {
            return null;
        }

        // Handle DD.MM.YYYY format (primary app format)
        if (stringValue.includes('.')) {
            const parts = stringValue.split('.');
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10);
                const year = parseInt(parts[2], 10);
                
                if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                    const date = new Date(year, month - 1, day);
                    if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
                        return date;
                    }
                }
            }
        }

        // Handle ISO date strings (YYYY-MM-DD or full ISO format)
        if (stringValue.includes('-')) {
            const isoDate = new Date(stringValue);
            if (!isNaN(isoDate.getTime())) {
                return isoDate;
            }
        }

        // Handle other common formats using Date.parse
        try {
            const parsedDate = new Date(Date.parse(stringValue));
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate;
            }
        } catch (e) {
            console.warn(`Could not parse date value: ${stringValue}`);
        }

        return null;
    }

    /**
     * Static utility method to format Date objects to DD.MM.YYYY string format.
     * Can be used by any component that needs to convert Date objects to the app's standard format.
     */
    static formatAppDateValue(date: Date): string {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
            return '';
        }

        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    }

    /**
     * Static utility method to convert Date objects to {year, month, day} format for backend.
     * Can be used by any component that needs to convert Date objects to the backend's expected format.
     */
    static formatAppDateObjectValue(date: Date): {year: number, month: number, day: number} | null {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
            return null;
        }

        return {
            year: date.getFullYear(),
            month: date.getMonth() + 1, // Convert from 0-indexed to 1-indexed
            day: date.getDate()
        };
    }
}

/**
 * Custom Material DateFormats for DD.MM.YYYY pattern
 * Replaces the NgBootstrap CustomNgbDateParserFormatter functionality
 */
export const CUSTOM_MAT_DATE_FORMATS: MatDateFormats = {
    parse: {
        dateInput: 'DD.MM.YYYY',
    },
    display: {
        dateInput: 'DD.MM.YYYY',
        monthYearLabel: 'MMM YYYY',
        dateA11yLabel: 'DD.MM.YYYY',
        monthYearA11yLabel: 'MMMM YYYY',
    },
};

// Legacy exports for backward compatibility (these are now deprecated)
// @deprecated Use CustomMaterialDateAdapter instead
export class CustomDatepickerI18n {
    constructor() {
        console.warn('CustomDatepickerI18n is deprecated. Use CustomMaterialDateAdapter instead.');
    }
}

// @deprecated Use CUSTOM_MAT_DATE_FORMATS instead
export class CustomNgbDateParserFormatter {
    constructor() {
        console.warn('CustomNgbDateParserFormatter is deprecated. Use CUSTOM_MAT_DATE_FORMATS instead.');
    }
}
