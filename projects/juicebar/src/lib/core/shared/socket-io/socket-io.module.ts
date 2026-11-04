import { ModuleWithProviders, NgModule } from '@angular/core';
import { SocketIoConfig } from './config/socket-io.config';
import { socketIoProviders } from './socket-io.providers';

/**
 * @deprecated Use `provideSocketIo(config)`. Kept for project code that imports `SocketIoModule.forRoot(config)`;
 * it gives the same providers.
 */
@NgModule({})
export class SocketIoModule {
    static forRoot(config: SocketIoConfig): ModuleWithProviders<SocketIoModule> {
        return {
            ngModule: SocketIoModule,
            providers: socketIoProviders(config)
        };
    }
}
