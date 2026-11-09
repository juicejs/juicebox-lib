import {Pipe} from '@angular/core';
import {TranslationPipe} from '../../../shared/pipes/TranslationPipe';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {locationsDictionary} from './locations_dictionary';

@Pipe({name: 'translate'})
export class LocationsTranslationPipe extends TranslationPipe {
  constructor(protected override juicebox: JuiceboxService) {
    super(juicebox);

    this.setDefault(this.juicebox.getLanguage());
    this.addDictionary(locationsDictionary);
  }
}
