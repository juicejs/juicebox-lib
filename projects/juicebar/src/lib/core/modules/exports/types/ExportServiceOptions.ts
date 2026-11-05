export interface FilterFetcherOptions {
    /** null after an option was picked from a search, as ng-select's typeahead sent it in the old admin */
    term: string | null,
    language: string,
    page: number,
    pageSize: number,
}

export interface GetExportTemplatesOptions {
    sort?: {
        prop: string,
        dir: string
    },
    filter?: Array<{
        property: string;
        fullText: true;
        language: string | boolean;
        term: string;
    }>,
    populateColumns?: boolean,
    populateFilters?: boolean,
    populateDataSource?: boolean,
    populateAvailableExportStrategies?: boolean
}

export interface GetExportTemplateOptions {
    populateColumns?: boolean,
    populateFilters?: boolean
}

export interface ExportDataOptions {
    language: string,
    page?: number,
    pageSize?: number,
    exportStrategyOptions?: { fileNameProperty?: string }
}