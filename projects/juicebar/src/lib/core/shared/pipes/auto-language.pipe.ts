import {inject, Injector, Pipe, PipeTransform} from '@angular/core';
import {JuiceboxService} from '../services/Juicebox.service';

export interface MultiLanguageObject {
    [key: string]: string | number // example: {en_GB: 'something'}
}

@Pipe({name: 'autoLanguage'})
export class AutoLanguagePipe implements PipeTransform {

    private juicebox: JuiceboxService;

    constructor(juicebox?: JuiceboxService) {
        this.juicebox = juicebox ?? inject(JuiceboxService);
    }

    transform(value: MultiLanguageObject | string | number, language?: string, localisationOrder?: Array<string>): any {
        let clearText;
        let fallback;

        if (!value) {
            return '';
        }
        if (!language) {
            language = this.juicebox.getLanguage();
        }
        if (value[language]) {
            clearText = value[language];
        } else {
            if (typeof value === 'string') {
                clearText = value;
            } else if (typeof value === 'number') {
                clearText = value.toString();
            } else {
                // if order of languages ex. [de_DE, en_GB] that you want to search for fallback is set
                if (localisationOrder && localisationOrder.length) {
                    for (const locOrder of localisationOrder) {
                        if (locOrder in value) {
                            clearText = value[locOrder];
                            fallback = locOrder.split('_')[0].toUpperCase();
                            break;
                        }
                    }
                } else {
                    const key = Object.keys(value).find(objectKey => value[objectKey]);
                    if (!key) {
                        return '';
                    }
                    fallback = key.split('_')[0].toUpperCase();
                    clearText = value[key];
                }
            }
        }

        return !!clearText ? (fallback ? `[${fallback}]` : '') + clearText : '';
    }

}
