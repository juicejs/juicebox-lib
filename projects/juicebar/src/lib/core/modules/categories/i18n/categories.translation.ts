import {Pipe} from '@angular/core';
import {TranslationPipe} from '../../../shared/pipes/TranslationPipe';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {categoriesDictionary} from './categories_dictionary';

@Pipe({name: 'translate'})
export class CategoriesTranslationPipe extends TranslationPipe {
  constructor(protected override juicebox: JuiceboxService) {
    super(juicebox);

    this.setDefault(this.juicebox.getLanguage());
    this.addDictionary(categoriesDictionary);
  }
}
