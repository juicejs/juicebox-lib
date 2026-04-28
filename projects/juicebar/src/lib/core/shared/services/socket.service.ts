import {Injectable, inject} from '@angular/core';
import {SnackbarService} from '../../../ui-components';
import {BehaviorSubject} from 'rxjs';
import {JuiceboxService} from './Juicebox.service';
import {SocketIoConfig} from '../socket-io/config/socket-io.config';
import {WrappedSocket} from '../socket-io/socket-io.service';

@Injectable({
  providedIn: 'root'
})
export class SocketService {

  private config: SocketIoConfig = {
    url: null,
    options: {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5
    }
  }
  private socket: WrappedSocket;
  _connected = new BehaviorSubject(false);

  private snackBar = inject(SnackbarService);
  private juicebox = inject(JuiceboxService);

  constructor() {}

  connect() {
    if (!this.juicebox.isLoggedIn()) return;
    if (this.socket && this.socket.ioSocket.connected) return;

    this.config.url = this.juicebox.getEndPoint();
    this.config.options.query = {token: this.juicebox.pleaseExtendYourServiceDontDoThis().getToken()};

    this.socket = new WrappedSocket(this.config);
    this.registerDefaultEvents();
    this.socket.connect();
  }

  disconnect() {
    this.socket.disconnect();
  }

  /**
   * Registers an event listener
   * @param eventName
   * @param callback
   */
  on(eventName: string, callback: Function) {
    this.socket.on(eventName, callback);
  }

  /**
   * Default events
   */
  private registerDefaultEvents() {
    this.on('connect', () => this._connected.next(true));
    this.on('disconnect', () => this._connected.next(false));
    this.on('message', (msg) => this.snackBar.open(msg, 'Close', 5000));
  }


}
