import {Pipe} from '@angular/core';
import {exportsDictionary} from './exports_dictionary';
import {TranslationPipe} from '../../../shared/pipes/TranslationPipe';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';

@Pipe({name: 'translate'})
export class ExportsTranslationPipe extends TranslationPipe {
    constructor(protected override juicebox: JuiceboxService) {
        super(juicebox);

        this.setDefault(this.juicebox.getLanguage());
        this.addDictionary(exportsDictionary);
    }
}
