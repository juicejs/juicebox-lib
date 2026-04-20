import {TranslationPipe} from '../pipes/TranslationPipe';
import {Pipe} from '@angular/core';
import {JuiceboxService} from '../services/Juicebox.service';
import { sharedDictionary } from './shared_dictionary';

@Pipe({name: 'translate'})
export class SharedTranslationPipe extends TranslationPipe {
    constructor(juicebox: JuiceboxService) {
        super(juicebox);

        this.setDefault(juicebox.getLanguage());
        this.addDictionary(sharedDictionary);

    }
}
