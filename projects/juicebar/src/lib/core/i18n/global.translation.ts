import {Pipe} from '@angular/core';
import {globalDictionary} from './global_dictionary';
import {TranslationPipe} from '../shared/pipes/TranslationPipe';
// import setup from '../../../generator/setup.json';
import {JuiceboxService} from '../shared/services/Juicebox.service';

@Pipe({name: 'translate'})
export class GlobalTranslationPipe extends TranslationPipe {
    constructor(protected override juicebox: JuiceboxService) {
        super(juicebox);

        // const loginLanguage = setup && setup.login_language ? setup.login_language : 'de_DE';
        const loginLanguage = 'de_DE';
        juicebox.setLanguage(loginLanguage);

        this.setDefault(juicebox.getLanguage());
        this.addDictionary(globalDictionary);
    }
}
