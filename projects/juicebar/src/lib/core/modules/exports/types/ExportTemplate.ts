import {ExportFilter, FilterValue} from './ExportFilter';
import {ExportColumn} from './ExportColumn';
import {ExportStrategy} from './ExportStrategy';

export interface ExportTemplate {
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