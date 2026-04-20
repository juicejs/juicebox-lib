export interface FilterFetcherOptions {
    term: string,
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