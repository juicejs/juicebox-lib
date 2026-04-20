import type {ExportValidators} from '../shared/ExportValidators';
import {MultiLanguageObject} from '../../../shared/pipes/auto-language.pipe';

export interface ExportFilter {
    id: string,
    label: string
    type: 'string' | 'number' | 'date' | 'select' | 'multiselect' | 'multiselect-async';
    validators?: Array<FilterValidator>;
    value?: any;
    items?: { id: string, label: string }[]
    dataFetcherStrategy?: string
}

export interface FilterValidator {
    key: keyof typeof ExportValidators;
    errorMessage: string | MultiLanguageObject;
    methodArgs?: Array<string | number | boolean>;
}

export interface FilterOptions {
    label: string;
    id: string;
}

export type FilterValue<TValue = any> = {
    id: string,
    value: TValue,
}
