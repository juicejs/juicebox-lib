import {ExportFilter, FilterValue} from './ExportFilter';
import {ExportColumn} from './ExportColumn';
import {ExportStrategy} from './ExportStrategy';

export interface ExportTemplate {
    _id?: string;
    data_source_key: string;
    name: string;
    columns: string[];
    filters: FilterValue[];
    sort: {
        dir: string;
        prop: string;
    };
    deleted: boolean;
    updated: string;
    meta?: {
        user_id?: string,
        organisation_id?: string
    };
    _columns?: ExportColumn[];
    _filters?: ExportFilter[];
    _data_source?: ExportStrategy;
    _available_export_strategies: ExportStrategy[];
}

/** What the create and edit pages store (`createExportTemplate`, `editExportTemplate`), as the old pages sent it */
export interface ExportTemplateFormValue {
    name: string;
    data_source_key: string;
    columns: string[];
    /** The filter values by filter id; dates as `{year, month, day}` */
    filters: Record<string, unknown> | null;
    sort: {prop: string | null, dir: string | null};
    meta: {user_id?: string, organisation_id?: string};
}
