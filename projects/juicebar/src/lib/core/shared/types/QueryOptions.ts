import {ISort} from '../interfaces/ISort';
import {ISearchTerm} from '../interfaces/ISearchTerm';

export interface QueryOptions {
    page?: number,
    pageSize?: number,
    sort?: ISort,
    filter?: ISearchTerm[] | any[]
}