import {inject, Pipe, PipeTransform} from '@angular/core';
import {AutoLanguagePipe} from '../../../shared/pipes/auto-language.pipe';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';

@Pipe({name: 'columnLabels', pure: true})
export class ColumnLabelsPipe implements PipeTransform {
    private autoLanguage = new AutoLanguagePipe(inject(JuiceboxService));

    /** A column (or filter) without a label shows its id, as in QC */
    transform(columns: Array<{id: string, label?: unknown}> | undefined, newLineSeparator = false): string {
        if (!columns?.length) return '';
        return columns.map(c => this.autoLanguage.transform((c.label || c.id) as string)).join(newLineSeparator ? ' \n' : ', ');
    }
}
