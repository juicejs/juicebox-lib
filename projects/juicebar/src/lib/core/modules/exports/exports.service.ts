import {inject, Injectable} from '@angular/core';
import {Result} from '../../shared/types/Result';
import {JuiceboxService} from '../../shared/services/Juicebox.service';
import {Juice} from '../../shared/services/juice.service';
import {ExportTemplate} from './types/ExportTemplate';
import {ExportFilter, FilterOptions, FilterValue} from './types/ExportFilter';
import {ExportColumn} from './types/ExportColumn';
import {ExportStrategy} from './types/ExportStrategy';
import {ExportDataOptions, FilterFetcherOptions, GetExportTemplateOptions, GetExportTemplatesOptions} from './types/ExportServiceOptions';

@Injectable({
  providedIn: 'root'}
)
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

    createExportTemplate(data: any): Promise<Result<ExportTemplate>> {
        return this.juice.request(
            'exports:template',
            'createExportTemplate',
            [data]
        );
    }

    editExportTemplate(id: string, data: any): Promise<Result<ExportTemplate>> {
        return this.juice.request(
            'exports:template',
            'editExportTemplate',
            [id, data]
        );
    }

    editExportTemplateFilters(id: string, data: any): Promise<Result> {
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

    exportData(exportTemplateId: string, exportStrategyKey: string, options: ExportDataOptions): Promise<Blob> {
        return this.juice.requestBinary(
            'exports',
            'exportData',
            [exportTemplateId, exportStrategyKey, options]
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
