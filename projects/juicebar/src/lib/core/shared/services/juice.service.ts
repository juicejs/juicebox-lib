import {Inject, Injectable, Injector} from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class Juice {

    private endpoint: string = 'https://staging.quality-circle.com';
    private httpUtil: HttpUtil;

    private eventListener: any;

    constructor(protected http: HttpClient, @Inject(Injector) private injector: Injector) {
        this.httpUtil = new HttpUtil(this.http, this);
    }

    addEventListener(eventListener: any){
        this.eventListener = eventListener;
    }

    async query(query: string, params: any): Promise<any> {

        const parsed = query.split(":");
        //if we are calling services which have ':' in key send them with '/' and then replace so parser dont split them
        if (parsed[0].includes('/'))
            parsed[0] = parsed[0].replace('/', ':')

        return await this.request(parsed[0], parsed[1], params);
    }

    request(service: string, method: string, params?: Array<any>, file?: File): Promise<any> {
        return new Promise((resolve, reject) => {

            let headers = new HttpHeaders();
            headers = headers.append('authorization', this.getToken());

            let _params;
            let body: any = params;

            if (file) {
                headers = headers.append('content-type', file.type);
                _params = params.map(param => typeof param == 'object' ? JSON.stringify(param) : param);
                body = file;
            }


            method = method.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

            let url = this.getEndPoint() + "/gateway/" + service + "/" + method
            this.http.post(url, body, {
                headers: headers,
                params: _params,
                observe: 'response'
            }).subscribe(data => {
                const newToken = data.headers.get('juice-token');
                if (newToken) {
                    this.setToken(newToken);
                }
                resolve(data.body);
            }, err => {
                if (err.status === 200) {
                    resolve(false);
                    throw new Error(err.message);
                } else if (err.status === 400){
                    this.eventListener(err.error);
                    resolve(false);
                } else if (err.status === 413) {
                    this._snackBar.open(err.message, 'Close', { duration: 5000, panelClass: 'error-snackbar' });
                    resolve(false);
                } else if (err.status == 0){
                    this._snackBar.open(err.message, 'Close', { duration: 5000, panelClass: 'error-snackbar' });
                    resolve(false);
                }
                reject(err);
            });
        });
    }

    requestBinary(service: string, method: string, params?: Array<any>): Promise<any> {
        return new Promise((resolve, reject) => {

            let headers = new HttpHeaders();
            headers = headers.append('authorization', this.getToken());

            this.http.post(this.getEndPoint() + '/gateway', {
                'service': service,
                'method': method,
                'params': params
            }, {
                headers: headers,
                observe: 'response',
                responseType: 'blob'
            }).subscribe(data => {
                const newToken = data.headers.get('juice-token');
                if (newToken) {
                    this.setToken(newToken);
                }
                resolve(data.body);
            }, err => {
                if (err.status === 413) {
                    this._snackBar.open(err.message, 'Close', { duration: 5000, panelClass: 'error-snackbar' });
                    throw new Error(err.message);
                }
                reject(err);
            });
        });
    }

    loadConfiguration(path: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.http.get(path).subscribe(config => {
                resolve(config);
            }, error => {
                resolve(null);
            });
        });
    }

    /**
     * @Deprecated Please use service RPC calls
     */
    getHttpUtil(): HttpUtil {
        return this.httpUtil;
    }

    setEndPoint(url) {
        this.endpoint = url;
    }

    getEndPoint() {
        return this.endpoint;
    }

    setToken(token: string) {
        localStorage.setItem('juice_token', JSON.stringify(token));
    }

    getToken(): string {
        try {
            const token = localStorage.getItem('juice_token');
            return JSON.parse(token);
        } catch (exception) {
            localStorage.clear();
            return null;
        }
    }

    private get _snackBar(): MatSnackBar {
        return this.injector.get(MatSnackBar);
    }

    showToast(type: 'success' | 'error' | 'warning' | 'info', message: string, action: string = 'Close', options?: any){
        const snackBarOptions = {
            duration: options?.duration || 5000,
            panelClass: `${type}-snackbar`,
            ...options
        };
        return this._snackBar.open(message, action, snackBarOptions);
    }

}

class HttpUtil {


    private juice: Juice;

    constructor(protected http: HttpClient, juice: Juice) {
        this.juice = juice;
    }

    /**
     * Universal function for sending data using POST method
     *
     * @param {string} url
     * @param body
     * @returns {Promise<any>}
     */
    post(url: string, body: any): Promise<any> {
        return new Promise((resolve, reject) => {

            let headers = new HttpHeaders();
            headers = headers.append('juice-token', this.juice.getToken());
            headers = headers.append('language', localStorage.getItem('language'));

            this.http.post(this.juice.getEndPoint() + url, body, {
                headers: headers,
                observe: 'response'
            }).subscribe(data => {
                const newToken = data.headers.get('juice-token');
                if (newToken) {
                    this.juice.setToken(newToken);
                }
                resolve(data.body);
            }, err => {
                if (err.status === 403) {
                    window.location.reload();
                }
                reject(err);
            });
        });
    }

    /**
     *
     * @param url
     * @param body
     */
    getBlob(url: string, body: any): Promise<any> {
        return new Promise((resolve, reject) => {

            let headers = new HttpHeaders();
            headers = headers.append('juice-token', this.juice.getToken());

            this.http.post(this.juice.getEndPoint() + url, body, {
                headers: headers,
                observe: 'response',
                responseType: 'blob'
            }).subscribe(data => {
                const newToken = data.headers.get('juice-token');
                if (newToken) {
                    this.juice.setToken(newToken);
                }
                resolve(data.body);
            }, err => {
                if (err.status === 403) {
                    window.location.reload();
                }
                reject(err);
            });
        });
    }

    /**
     * Universal function for sending data using PUT method
     *
     * @param {string} url
     * @param body
     * @returns {Promise<any>}
     */
    put(url: string, body: any): Promise<any> {
        return new Promise((resolve, reject) => {

            let headers = new HttpHeaders();
            headers = headers.append('juice-token', this.juice.getToken());

            this.http.put(this.juice.getEndPoint() + url, body, {
                headers: headers,
                observe: 'response'
            }).subscribe(data => {
                const newToken = data.headers.get('juice-token');
                if (newToken) {
                    this.juice.setToken(newToken);
                }
                resolve(data.body);
            }, error => {
                if (error.status === 403) {
                    window.location.reload();
                }
                reject(error);
            });

        });
    }

    /**
     * Sending request for some resource specified in params
     *
     * @param {string} url
     * @param params
     * @returns {Promise<any>}
     */

    get(url: string, params?: any): Promise<any> {
        return new Promise((resolve, reject) => {

            let _params = '';
            for (const key in params) {
                _params += '/' + params[key];
            }

            const d = this.juice.getToken();

            let headers = new HttpHeaders();
            headers = headers.append('juice-token', this.juice.getToken());

            this.http.get(this.juice.getEndPoint() + url + _params, {
                headers: headers,
                observe: 'response'
            }).subscribe(data => {
                const newToken = data.headers.get('juice-token');
                if (newToken) {
                    this.juice.setToken(newToken);
                }
                resolve(data.body);
            }, error => {
                if (error.status === 403) {
                    window.location.reload();
                }
                reject(error);
            });
        });
    }

    /**
     * Deletes resource specified in params
     *
     * @param url
     * @param params
     * @returns {Promise<any>}
     */
    delete(url, params?): Promise<any> {
        return new Promise((resolve, reject) => {

            let _params = '';
            for (const key in params) {
                _params += '/' + params[key];
            }

            let headers = new HttpHeaders();
            headers = headers.append('juice-token', this.juice.getToken());

            this.http.delete(this.juice.getEndPoint() + url + _params, {
                headers: headers,
                observe: 'response'
            }).subscribe(data => {
                const newToken = data.headers.get('juice-token');
                if (newToken) {
                    this.juice.setToken(newToken);
                }
                resolve(data);
            }, error => {
                if (error.status === 403) {
                    window.location.reload();
                }
                reject(error);
            });
        });
    }

    /**
     * Upload helper
     *
     * @param url
     * @param payload
     * @param data
     */
    upload(url, payload, data?): Promise<any> {
        return new Promise((resolve, reject) => {

            let headers = new HttpHeaders();
            headers = headers.append('juice-token', this.juice.getToken());
            headers.set('content-type', 'multipart/form-data');
            // headers.set('Upload-Content-Type', payload.type);

            const formData: FormData = new FormData();
            formData.append('file', payload);
            if (data) {
                formData.append('data', JSON.stringify(data));
            }

            this.http.post(this.juice.getEndPoint() + url, formData, {
                headers: headers,
                observe: 'response'
            }).subscribe(data => {
                const newToken = data.headers.get('juice-token');
                if (newToken) {
                    this.juice.setToken(newToken);
                }
                resolve(data.body);
            }, error => {
                if (error.status === 403) {
                    window.location.reload();
                }
                reject(error);
            });

        });
    }





}
