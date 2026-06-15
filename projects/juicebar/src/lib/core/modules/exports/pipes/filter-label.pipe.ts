import {inject, Pipe, PipeTransform} from '@angular/core';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {AutoLanguagePipe} from '../../../shared/pipes/auto-language.pipe';
import {ExportFilter} from '../types/ExportFilter';

@Pipe({name: 'filterLabel', pure: true})
export class FilterLabelPipe implements PipeTransform {
    private autoLanguage = new AutoLanguagePipe(inject(JuiceboxService));

    transform(filter: ExportFilter): string {
        const isRequired = !!filter.validators?.some(v => v.key === 'required');
        return `${this.autoLanguage.transform(filter.label)}${isRequired ? ' *' : ''}`;
    }
}
