export type Configuration = {
    key: string;
    schema?: string,
    type?: string,
    description?: string,
    base?: string,
    owner?: string,
    name: string,
    attribute?: string,
    params?: any,
    enabled?: boolean,
    value?: any,
    module?: string,
    model?: string,
    options?: any,
    target?: string,
    required?: boolean,
    reference?: string,
    _reference?: Configuration,
    adapter?: string,
    reference_id?: string;
    scope?: string,
    created?: Date,
    updated?: Date,
    inject?: Array<string>
}