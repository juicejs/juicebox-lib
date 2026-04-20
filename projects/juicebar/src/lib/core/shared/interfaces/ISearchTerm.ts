export interface ISearchTerm {
    property: string;
    fullText?: boolean;
    language?: string | boolean;
    term: string | number;
    type?: SearchTermType;
    languages?: Array<string>;
}

export type SearchTermType = 'string' | 'int' | 'objectid' | 'multilang'
