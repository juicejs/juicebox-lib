import {Configuration} from './Configuration';

export type ComparedConfiguration = {
    configurations: {
        memory: Configuration,
        database: Configuration,
    },
    comparison: {
        equal: boolean,
        difference: any
    },
    configuration?: Configuration // applied category from memory, doesnt exists than from database
};