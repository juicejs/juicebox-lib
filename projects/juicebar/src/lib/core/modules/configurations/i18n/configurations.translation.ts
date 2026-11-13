import {inject, Pipe} from '@angular/core';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {TranslationPipe} from '../../../shared/pipes/TranslationPipe';
import {configurationsDictionary} from './configurations_dictionary';

/** The module's labels, in the admin's language. A label without a text in that language shows as `@key`. */
@Pipe({name: 'translate'})
export class ConfigurationsTranslationPipe extends TranslationPipe {
  constructor() {
    const juicebox = inject(JuiceboxService);
    super(juicebox);
    this.setDefault(juicebox.getLanguage());
    this.addDictionary(configurationsDictionary);
  }
}
