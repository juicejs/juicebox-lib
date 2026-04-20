import {PipeTransform} from '@angular/core';
import {JuiceboxService} from '../services/Juicebox.service';

export abstract class TranslationPipe implements PipeTransform {

    dictionary: any = {};
    defaultLanguage: string;

    protected constructor(protected juicebox: JuiceboxService){}

    addDictionary(dict: any){
        this.dictionary = dict;
    }
    setDefault(lang: string){
        this.defaultLanguage = lang;
    }

    transform(value: any, ...args: any[]): any {
        const lang = this.juicebox.getLanguage();
        if (!value)
            return value;

        // object with translations
        if (!(typeof value === 'string')) {
            if (value.hasOwnProperty(lang)) return value[lang];
            else if (value.hasOwnProperty(this.defaultLanguage)) return value[this.defaultLanguage];
            else return value[Object.keys(value)[0]];
        }

        if (!this.dictionary)
            return '@' + value;

        // translate string
        if (this.dictionary[value]) {
            if (this.dictionary[value][lang])
                return args && args.length ? this.includeArguments(this.dictionary[value][lang], args) : this.dictionary[value][lang];
            else if (this.dictionary[value][this.defaultLanguage])
                return args && args.length ? this.includeArguments(this.dictionary[value][this.defaultLanguage], args) : this.dictionary[value][this.defaultLanguage];
            else
                return '@' + value;
        }
        return '@' + value;

    }

    private includeArguments(key: string, args: Array<any>) {
        const argObject = args[0];
        for (const arg in argObject) {
            key = key.replace(`{{${ arg }}}`, argObject[arg]);
        }

        return key;
    }

}
