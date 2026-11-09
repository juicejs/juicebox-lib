import {inject, Injectable} from '@angular/core';
import {Result} from '../../shared/types/Result';
import {JuiceboxService} from '../../shared/services/Juicebox.service';
import {Juice} from '../../shared/services/juice.service';
import {ExportTemplate, ExportTemplateFormValue} from './types/ExportTemplate';
import {ExportFilter, FilterOptions, FilterValue} from './types/ExportFilter';
import {ExportColumn} from './types/ExportColumn';
import {ExportStrategy} from './types/ExportStrategy';
import {ExportDataOptions, FilterFetcherOptions, GetExportTemplateOptions, GetExportTemplatesOptions} from './types/ExportServiceOptions';

@Injectable({providedIn: 'root'})
export class ExportsService {
    private juice = inject(Juice);
    private juicebox = inject(JuiceboxService);

    getExportTemplates(page: number, pageSize: number, options: GetExportTemplatesOptions = {}): Promise<Result<{
        items: Array<ExportTemplate>,
        count: number
    }>> {
        return this.juice.request(
            'exports:template',
            'getExportTemplates',
            [page, pageSize, options]
        );
    }

    getExportTemplate(exportTemplateId: string, options: GetExportTemplateOptions = {}): Promise<Result<ExportTemplate>> {
        return this.juice.request(
            'exports:template',
            'getExportTemplate',
            [exportTemplateId, options]
        );
    }

    createExportTemplate(data: ExportTemplateFormValue): Promise<Result<ExportTemplate>> {
        return this.juice.request(
            'exports:template',
            'createExportTemplate',
            [data]
        );
    }

    editExportTemplate(id: string, data: ExportTemplateFormValue): Promise<Result<ExportTemplate>> {
        return this.juice.request(
            'exports:template',
            'editExportTemplate',
            [id, data]
        );
    }

    /** Stores the filters the Excel dialog changed before exporting */
    editExportTemplateFilters(id: string, data: {filters: Record<string, unknown>}): Promise<Result> {
        return this.juice.request(
            'exports:template',
            'editExportTemplateFilters',
            [id, data]
        )
    }

    deleteExportTemplate(id: string): Promise<Result> {
        return this.juice.request(
            'exports:template',
            'deleteExportTemplate',
            [id]
        );
    }

    getDataSourceStrategies(): Promise<Result<Array<ExportStrategy>>> {
        return this.juice.request(
            'exports:data-source',
            'getDataSourceStrategies',
            []
        );
    }

    getFilters(datasourceStrategyKey: string): Promise<Result<Array<ExportFilter>>> {
        return this.juice.request(
            'exports:filter',
            'getDataSourceFilters',
            [datasourceStrategyKey]
        );
    }

    getColumns(datasourceStrategyKey: string): Promise<Result<Array<ExportColumn>>> {
        return this.juice.request(
            'exports:column',
            'getDataSourceColumns',
            [datasourceStrategyKey]
        );
    }

    getDataSourceFileNameColumns(exportTemplateId: string, dataSourceKey: string): Promise<Result<Array<ExportColumn>>> {
        return this.juice.request(
            'exports:column',
            'getDataSourceFileNameColumns',
            [exportTemplateId, dataSourceKey]
        );
    }

    getDataExportStrategies(): Promise<Result<Array<ExportStrategy>>> {
        return this.juice.request(
            'exports:data-source',
            'getDataExportStrategies',
            []
        );
    }

    /** The exported file; `timeoutMs` cancels a download that takes longer */
    exportData(exportTemplateId: string, exportStrategyKey: string, options: ExportDataOptions, timeoutMs?: number): Promise<Blob> {
        return this.juice.requestBinary(
            'exports',
            'exportData',
            [exportTemplateId, exportStrategyKey, options],
            timeoutMs
        );
    }

    getPreview(exportTemplateId: string, options: ExportDataOptions = {language: this.juicebox.getLanguage(), page: 1, pageSize: 10}): Promise<Result<{
        items: any[],
        columns: ExportColumn[]
    }>> {
        return this.juice.request(
            'exports',
            'getPreview',
            [exportTemplateId, options]
        );
    }

    getFilterOptions(filterId: string, dataSourceKey: string, allFilterValues: Array<FilterValue>, options: FilterFetcherOptions, fetchInitialValues = false): Promise<Result<Array<FilterOptions>>> {
        return this.juice.request(
            'exports:filter',
            'getAsyncFilterItems',
            [{filterId, dataSourceKey, allFilterValues, options, fetchInitialValues}]
        );
    }

}
