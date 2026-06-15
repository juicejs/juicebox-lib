import {inject, Pipe, PipeTransform} from '@angular/core';
import {AutoLanguagePipe} from '../../../shared/pipes/auto-language.pipe';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';

@Pipe({name: 'columnLabels', pure: true})
export class ColumnLabelsPipe implements PipeTransform {
    private autoLanguage = new AutoLanguagePipe(inject(JuiceboxService));

    transform(columns: any[], newLineSeparator = false): string {
        if (!columns?.length) return '';
        return columns.map(c => this.autoLanguage.transform(c.label)).join(newLineSeparator ? ' \n' : ', ');
    }
}
