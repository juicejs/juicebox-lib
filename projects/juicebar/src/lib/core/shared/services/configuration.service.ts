import {inject, Injectable} from '@angular/core';
import {Result} from '../types/Result';
import {ComparedConfiguration} from '../types/ComparedConfiguration';
import {Juice} from './juice.service';

@Injectable({providedIn: 'root'})
export class ConfigurationService {
    private juice = inject(Juice);

    /**
     * Finds and returns the configuration (by key) saved in the memory
     * @param key
     */
    getByKey(key: string) {
        return this.juice.request(
            'juicebox:configuration:service',
            'getByKey',
            [key]
        );
    }

    /**
     * Finds and returns all the configurations (by schema) saved in the memory
     * @param schema
     */
    getBySchema(schema) {
        return this.juice.request(
            'juicebox:configuration:service',
            'getBySchema',
            [schema]
        );
    }


    // ********************************* Used only for configuration module *********************************

    /**
     * Fetches all configurations in memory and database, and compares differences from memory and database for each configuration
     */
    fetch(): Promise<Result<ComparedConfiguration[]>> {
        return this.juice.request(
            'juicebox:configuration:service',
            'fetch',
            []
        );
    }

    /**
     * Creates a new configurations and saves it in memory and database
     * @param configuration
     */
    install(configuration: any): Promise<Result> {
        return this.juice.request(
            'juicebox:configuration:service',
            'install',
            [configuration]
        );
    }

    /**
     * Updates the existing configuration in the memory and database
     * @param configuration
     */
    update(configuration): Promise<Result> {
        return this.juice.request(
            'juicebox:configuration:service',
            'update',
            [configuration]
        );
    }

    /**
     * Deletes the configuration from memory and database
     * @param key
     */
    delete(key): Promise<Result> {
        return this.juice.request(
            'juicebox:configuration:service',
            'delete',
            [key]
        );
    }

    /**
     * Compares configuration differences from memory and databases
     * @param key
     */
    compare(key): Promise<Result<ComparedConfiguration>> {
        return this.juice.request(
            'juicebox:configuration:service',
            'compare',
            [key]
        );
    }

}
