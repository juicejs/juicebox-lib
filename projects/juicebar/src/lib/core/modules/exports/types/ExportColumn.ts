import {MultiLanguageObject} from '../../../shared/pipes/auto-language.pipe';

export interface ExportColumn {
    id: string,
    label: string | MultiLanguageObject,
    sortable: boolean,
    description?: MultiLanguageObject // used for a popup in juicebox
    fileName?: boolean, // if this value is set as true, this column can be used for generating a filename
}
