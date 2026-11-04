import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders, Provider } from '@angular/core';
import { SocketIoConfig } from './config/socket-io.config';
import { WrappedSocket } from './socket-io.service';

/** Socket factory */
export function SocketFactory(config: SocketIoConfig) {
    return new WrappedSocket(config);
}

export const SOCKET_CONFIG_TOKEN = new InjectionToken<SocketIoConfig>('__SOCKET_IO_CONFIG__');

/** Provides a WrappedSocket connected with the given config (was `SocketIoModule.forRoot(config)`) */
export function provideSocketIo(config: SocketIoConfig): EnvironmentProviders {
    return makeEnvironmentProviders(socketIoProviders(config));
}

/** The providers behind provideSocketIo, also used by the deprecated SocketIoModule.forRoot */
export function socketIoProviders(config: SocketIoConfig): Provider[] {
    return [
        { provide: SOCKET_CONFIG_TOKEN, useValue: config },
        {
            provide: WrappedSocket,
            useFactory: SocketFactory,
            deps: [SOCKET_CONFIG_TOKEN]
        }
    ];
}
