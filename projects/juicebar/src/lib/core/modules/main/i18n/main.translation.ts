import {Pipe} from '@angular/core';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {TranslationPipe} from '../../../shared/pipes/TranslationPipe';
import {mainDictionary} from './main_dictionary';

@Pipe({name: 'translate'})
export class MainTranslationPipe extends TranslationPipe {
    constructor(protected override juicebox: JuiceboxService) {
        super(juicebox);

        this.setDefault(juicebox.getLanguage());
        this.addDictionary(mainDictionary);
    }
}
