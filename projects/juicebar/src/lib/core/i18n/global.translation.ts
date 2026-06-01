import {Pipe} from '@angular/core';
import {globalDictionary} from './global_dictionary';
import {TranslationPipe} from '../shared/pipes/TranslationPipe';
// import setup from '../../../generator/setup.json';
import {JuiceboxService} from '../shared/services/Juicebox.service';

@Pipe({name: 'translate'})
export class GlobalTranslationPipe extends TranslationPipe {
    constructor(protected override juicebox: JuiceboxService) {
        super(juicebox);

        this.setDefault('de_DE');
        this.addDictionary(globalDictionary);
    }
}
