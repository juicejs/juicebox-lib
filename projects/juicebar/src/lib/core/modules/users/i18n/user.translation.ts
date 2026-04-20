import {Pipe} from '@angular/core';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {TranslationPipe} from '../../../shared/pipes/TranslationPipe';

// Testing new
import {usersDictionary} from './users_dictionary';

@Pipe({name: 'translate'})
export class UserTranslationPipe extends TranslationPipe {
    constructor(juicebox: JuiceboxService) {
        super(juicebox);

        this.setDefault(juicebox.getLanguage());
        this.addDictionary(usersDictionary);
    }
}
