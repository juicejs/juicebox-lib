import {Pipe} from '@angular/core';
import {TranslationPipe} from '../../../pipes/TranslationPipe';
import {JuiceboxService} from '../../../services/Juicebox.service';
import {mediaDictionary} from './media_dictionary';

@Pipe({name: 'translate'})
export class MediaTranslationPipe extends TranslationPipe {
  constructor(protected override juicebox: JuiceboxService) {
    super(juicebox);

    this.setDefault(this.juicebox.getLanguage());
    this.addDictionary(mediaDictionary);
  }
}
