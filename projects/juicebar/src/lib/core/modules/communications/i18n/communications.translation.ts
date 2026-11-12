import {Pipe} from '@angular/core';
import {TranslationPipe} from '../../../shared/pipes/TranslationPipe';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {communicationsDictionary} from './communications_dictionary';

@Pipe({name: 'translate'})
export class CommunicationsTranslationPipe extends TranslationPipe {
  constructor(protected override juicebox: JuiceboxService) {
    super(juicebox);

    this.setDefault(this.juicebox.getLanguage());
    this.addDictionary(communicationsDictionary);
  }
}
