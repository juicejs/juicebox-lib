import {inject, Injectable, Injector, isDevMode, Type} from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {SnackbarService} from "../../../ui-components";
import { interval, Observable, Subject, Subscription } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { Juice } from './juice.service';
import { DOCUMENT } from '@angular/common';
import { IJuiceboxExtensions } from '../models/searchprovider.interface';
import { switchMap } from 'rxjs/operators';
import { ActionButton } from '../types/ActionButton';
import { Result } from '../types/Result';

class AckButton {
    set promiseBtn(passedValue: any) {
        console.log("now");
        const isObservable: boolean = passedValue instanceof Observable;
        const isSubscription: boolean = passedValue instanceof Subscription;
        const isBoolean: boolean = typeof passedValue === 'boolean';
        const isPromise: boolean = passedValue instanceof Promise || (
            passedValue !== null &&
            typeof passedValue === 'object' &&
            typeof passedValue.then === 'function' &&
            typeof passedValue.catch === 'function'
        );
    }
}

@Injectable({
    providedIn: 'root'
})
export class JuiceboxService {

    private _user;
    private _type;
    private _options;
    private _language;
    private token: string;
    private polling: Subscription;
    private authenticator: string;
    private dataStore: any = {};
    private _unsavedChangesGuard: boolean;
    private _navigationEvent = new Subject();
    navigationEvent$ = this._navigationEvent.asObservable();

    public collapsed: boolean = false;
    public nextUi: boolean = false;

    public searchProvider: Array<any> = new Array<any>();
    public searchActive: boolean = false;
    public searchResults: Array<any> = [];

    public actionButtons: Array<any> = [];

    //component registry
    public registry = new Map<string, Type<any>>();

    protected http = inject(HttpClient);
    private juice = inject(Juice);
    private document = inject(DOCUMENT);
    private injector = inject(Injector);
    private snackbar = inject(SnackbarService);

    constructor() {
        this.juice.addEventListener((e) => {
            if (e == 'Not authenticated') {
                this.showWarning(`Missing Permission`, "");
            }
            if (e.startsWith('Not authenticated')){
                const roles = e.split("[")[1].slice(0, -1).split(",");
                this.showWarning('Missing Permission', `${roles.join("-")}`);
            }
        });

        // next ui
        this.nextUi = JSON.parse(localStorage.getItem('next-ui')) || false;
        if (this.nextUi) {
            this.addNextUi();
        }
    }

    setActionButtons(buttons: Array<ActionButton>) {
        // Use setTimeout to push this change to the next cycle
        setTimeout(() => {
            const processedButtons = [];
            for(let button of buttons){
                // Create a new button object instead of modifying in place
                const newButton = {...button};
                newButton.callAction = async () => {
                    newButton.promise = await button.callback();
                };
                processedButtons.push(newButton);
            }
            this.actionButtons = processedButtons;
        }, 0);
    }

    getJuiceInstance() {
        return this.juice;
    }

    registerSearchProvider(provider: IJuiceboxExtensions, name: string, icon: string, role?:string) {
        this.searchProvider.push({
            name: name,
            icon: icon,
            provider: provider,
            role: role
        });
    }

    async doSearch(token: string) {
        this.searchActive = true;
        this.searchResults = [];
        const searchRequests = [];
        for (let provider of this.searchProvider) {
            if (this.hasRole(provider.role)) {
                searchRequests.push(provider.provider.search(token).then(results => {
                    this.searchResults.push({
                        name: provider.name,
                        icon: provider.icon,
                        results: results
                    });
                }));
            }
        }
        return Promise.all(searchRequests);
    }

    addNextUi() {
        this.document.querySelector('head').insertAdjacentHTML('beforeend',
            '<style id="custom-style">' +
            '    </style>');
    }

    setUiNext(state: boolean) {
        this.nextUi = state;
        localStorage.setItem('next-ui', this.nextUi.toString());
        if (this.nextUi) {
            this.addNextUi();
        } else {
            const head = this.document.querySelector('head');
            const style = head.querySelector('#custom-style');
            style.remove();
        }

        return false;
    }

    /**
     * Initialize connection to Juice API.
     * If a token is available (stored in cache) the token
     * will be validated.
     *
     * @returns {Promise<boolean>}
     */
    async init(config?: string): Promise<any> {
        const user = await this.requestToken();
        if (user) {
            this.setUser(user);

            const options = await this.juice.request('juicebox', 'getOptions', []);
            this.setOptions(options);

            return true;
        }

        return false;
    }

    public pleaseExtendYourServiceDontDoThis(): Juice {
        return this.juice;
    }

    showToast(type: 'success' | 'error' | 'warning' | 'info', message: string, action: string = 'Close', options?: any) {
        const snackBarOptions = {
            duration: options?.duration || 5000,
            panelClass: `${type}-snackbar`,
            ...options
        };
        return this.snackbar.open(message, action, snackBarOptions);
    }

    setAuthenticator(auth: string) {
        this.authenticator = auth;
    }

    getAuthenticator() {
        return this.authenticator;
    }

    async getOrganisation(orgID: string): Promise<any> {
        const result = await this.juice.request('entities', 'fetchEntityById', [orgID]);
        if (!result || !result.success) {
            return result;
        }

        return result.payload;
    }

    // gets only the organisation which is currently logged in juicebox, with populated roles and groups
    async getLoggedInOrganisation() {
        const result = await this.juice.request(
            'juicebox',
            'getJuiceboxOrganisation',
            []);
        if (!result || !result.success) {
            return result;
        }

        return result.payload;
    }

    deleteLocalStorage(): void {
        localStorage.clear();
    }

    getWindow(){
        return window;
    }

    logout() {
        this.deleteLocalStorage();
        window.location.reload();
    }

    requestToken(): Promise<any> {
        return new Promise((resolve, reject) => {
            const token = this.juice.getToken();
            if (!token) {
                return resolve(false);
            }

            let headers = new HttpHeaders();
            headers = headers.append('juice-token', token);

            const body: any = {
                'service': 'juicebox:authentication:service',
                'method': 'validateToken',
                'params': []
            };

            this.http.post(this.juice.getEndPoint() + '/gateway', body, {
                headers: headers,
                params: null,
                observe: 'response'
            }).subscribe(response => {
                if ((response.body as any).success) {
                    return resolve((response.body as any).user);
                } else {
                    localStorage.removeItem('juice_token');
                    return resolve(null);
                }
            }, err => {
                if (err.status === 200) {
                    resolve(false);
                }
                reject(err);
            });
        });
    }

    auth(authenticator: string, credentials: any, organisation?: string, twoFactor?: { code: string, timestamp: string | number }): Promise<any> {
        return new Promise((resolve, reject) => {
            const twoFactorAuth = twoFactor && twoFactor.code && twoFactor.timestamp
                ? twoFactor
                : { code: '', timestamp: '' };
            const body: any = {
                'service': 'juicebox:authentication:service',
                'method': 'auth',
                'params': [this.getAuthenticator() ? this.getAuthenticator() : authenticator, organisation, credentials, twoFactorAuth]
            };

            this.http.post(this.juice.getEndPoint() + '/gateway', body, {}).subscribe(
                (data: any) => {
                    if (!data || !data.success) {
                        return resolve(data);
                    }

                    // set token
                    this.juice.setToken(data.token);

                    // user settings
                    if (data.user && data.user.attributes && data.user.attributes.settings) {
                        localStorage.setItem('next-ui', <any>!!data.user.attributes.settings.nextUi);
                    }

                    return resolve({
                        success: true,
                        organisations: data.organisations,
                        twoFactor: data.twoFactor,
                        welcomeMessageKey: this.getWelcomeMessageKey(data.user),
                        hasTwoFactor: this.isTwoFactorSet(data.user),
                        user: data.user
                    });
                },
                err => {
                    if (err.status === 200) {
                        resolve({ success: false, error: err });
                    }
                    reject(err);
                });
        });
    }

    loginAsAnotherUser(user_id: string, code: string, organisation_id: string): Promise<Result> {
        return this.juice.request(
            'juicebox:authentication:service',
            'loginAsAnotherUser',
            [user_id, code, organisation_id]
        );
    }

    /**
     * Update currently logged in user
     *
     * @param data
     * @returns {Promise<any>}
     */
    updateUser(data: { firstname: string, lastname: string }): Promise<any> {
        return this.juice.request(
            'juicebox',
            'updateUser',
            [data]
        );
    }

    /**
     * Update currently logged in user password
     *
     * @param {string} password
     * @param currentPassword
     * @returns {Promise<any>}
     */
    updatePassword(password: string, currentPassword: string) {
        return this.juice.request(
            'juicebox',
            'updatePassword',
            [password, currentPassword]
        );
    }

    private getWelcomeMessageKey(user) {
        return user && user.attributes && user.attributes.welcomeMessageKey
            ? user.attributes.welcomeMessageKey
            : null;
    }

    private isTwoFactorSet(user) {
        return user
            && user.attributes
            && user.attributes.settings
            && user.attributes.settings.twoFactor;
    }

    /**
     * Save custom sidebar settings
     */
    async saveSidebarSettings(settings){
        const sidebar = this._user.attributes.settings.sidebar || {};
        sidebar[this.getUserOrganisationId()] = settings;
        await this.saveUserSettings(this._user._id, {
            sidebar: sidebar
        });
    }

    /**
     * Save user juicebox settings (for now only language)
     * @param userId
     * @param settings
     */
    saveUserSettings(userId: string, settings: any) {
        return this.juice.request(
            'juicebox',
            'saveUserSettings',
            [userId, settings]
        );
    }

    /**
     * Reset 2FA of the current logged-in user
     */
    resetTwoFactor() {
        return this.juice.request(
            'juicebox',
            'resetTwoFactor',
            []
        );
    }

    /**
     * Get users organisations
     * @param userId
     */
    getOrganisations(userId: string): Promise<any> {
        return this.juice.request(
            'juicebox',
            'getOrganisations',
            [userId]
        );
    }

    async downloadHelpFile(module: string, language: string): Promise<boolean> {
        const result = await this.juice.request(
            'juicebox',
            'getHelpFileInfo',
            [{ module, language }]
        );

        if (!result || !result.success) {
            return false;
        }

        const filePath = this.juice.getEndPoint() + '/' + result.payload.path;
        window.open(filePath, '_blank');

        return true;
    }

    deleteHelpFile(module: string, language: string) {
        return this.juice.request(
            'juicebox',
            'deleteHelpFile',
            [{ module, language }]
        );
    }

    getHelpFileInfo(module: string, language: string) {
        return this.juice.request(
            'juicebox',
            'getHelpFileInfo',
            [{ module, language }]
        );
    }

    uploadHelpFile(module: string, language: string, name: string, type: string, file: File) {
        return this.juice.request(
            'juicebox',
            'uploadHelpFile',
            [{ module, language, name, type }],
            file
        );
    }

    forgotPassword(service: string, method: string, params?: Array<any>): Promise<any> {
        return new Promise((resolve, reject) => {

            const body: any = {
                'service': service,
                'method': method,
                'params': params
            };
            this.http.post(this.juice.getEndPoint() + '/gateway', body, {
                observe: 'response'
            }).subscribe(data => {
                resolve(data.body);
            }, err => {
                if (err.status === 200) {
                    resolve(false);
                    //   this.showError(err);
                }
                reject(err);
            });
        });
    }

    /**
     * Super admins can see all organisations and others can only see their
     */
    getAvailableOrganisations(page: number, pageSize: number, options: any): Promise<any> {
        return this.juice.request(
            'juicebox',
            'getAvailableOrganisations',
            [page, pageSize, options]
        );
    }

    addOrganisationToUser(user_id: string, organisation_id: string): Promise<Result> {
        return this.juice.request(
            'juicebox:organisations:service',
            'addOrganisationToUser',
            [user_id, organisation_id]
        );
    }

    removeOrganisationFromUser(user_id: string, organisation_id: string): Promise<Result> {
        return this.juice.request(
            'juicebox:organisations:service',
            'removeOrganisationFromUser',
            [user_id, organisation_id]
        );
    }

    async switchActiveOrganisation(selectedOrganisationId) {
        const old_org = await this.getLoggedInOrganisation();

        const switchResult: Result = await this.juice.request(
            'juicebox:organisations:service',
            'switchActiveOrganisation',
            [selectedOrganisationId]
        );

        if(!switchResult || !switchResult.success || !switchResult.payload) return;

        // Route to new oraganisation
        if(old_org.client_route)
            localStorage.setItem("client_route_switch", old_org.client_route);

        this.juice.setToken(switchResult.payload);

        const org = await this.getLoggedInOrganisation();
        if(org.client_route)
            this.setOrganisationRoute(org.client_route);
        else
            this.removeOrganisationRoute();

        window.location.reload();
    }

    // For multiple oraganisation routes (UI changes per client)
    setOrganisationRoute(route) {
        localStorage.setItem("client_route", route);
        sessionStorage.setItem("client_route", route);
    }
    getOrganisationRoute() {
        return sessionStorage.getItem("client_route") || localStorage.getItem("client_route");
    }
    removeOrganisationRoute() {
        localStorage.removeItem("client_route");
        sessionStorage.removeItem("client_route");
    }
    setMainOrganisationRoute(route){
        sessionStorage.setItem("client_route_main", route)
    }
    getMainOrganisationRoute(){
        return sessionStorage.getItem("client_route_main")
    }

    async addHelpText(data) {
        return this.juice.request(
            'juicebox',
            'addHelpText',
            [data]
        )
    }

    async getHelpText(data) {
        return this.juice.request(
            'juicebox',
            'getHelpText',
            [data]
        )
    }

    isLoggedIn() {
        return this.juice.getToken() != null;
    }

    get language() {
        return this._language;
    }

    getData(key, defaultValue?: any): Observable<any> {
        if (!this.dataStore[key]) {
            this.setData(key, defaultValue);
        }
        return this.dataStore[key].asObservable();
    }

    setData(key, value) {
        if (!key) {
            return null;
        }

        // if key exists
        if (key in this.dataStore) {
            return this.dataStore[key].next(value);
        }
        this.dataStore[key] = new BehaviorSubject(value);
    }

    unsetData(key): void {
        if (this.dataStore[key]) {
            delete this.dataStore[key];
        }
    }

    navigationEvent(details: { location: string, subject?: string, link: string, breadcrumps?: Array<any> }) {
        this._navigationEvent.next(details);
    }

    setTitleAndBreadcrumps(title: string, breadcrumps?: Array<{
        title: string,
        link?: Array<string>
    }>) {
        this._navigationEvent.next({
            location: title,
            breadcrumps: breadcrumps
        });
    }

    getLocalJsonFile(file: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.http.get(file).subscribe((result: any) => {
                resolve(result);
            }, error => {
                reject(error);
            });
        });
    }

    getUser() {
        return this._user;
    }

    // get currently logged in juicebox user
    getJuiceboxUser() {
        return this.juice.request(
            'juicebox',
            'getJuiceboxUser',
            []
        );
    }


    getUserId(): string {
        return this._user ? this._user._id : null;
    }

    getUserOrganisationId(): string {
        return this._user ? this._user.organisation_id : null;
    }

    hasRole(role): boolean {
        const user = this.getUser();
        if (!user || !user.roles) {
            return false;
        }
        const hasRole = user.roles.find(_role => {
            return _role.role === role;
        });
        return !!hasRole;
    }

    hasPermission(permission: string): boolean | void {
        const role = permission.split('#')[0];
        const perm = permission.split('#')[1];

        const user = this.getUser();
        if (!user || !user.roles) {
            return false;
        }

        const hasRole = user.roles.find(_role => {
            return _role.role == role;
        });

        if (hasRole && hasRole.permissions) {

            let separatedPermissions: any = [];
            let allow: boolean = false;

            //Case to have all permissions on directive
            if (perm.includes(',')) {
                separatedPermissions = perm.split(',');
                separatedPermissions.forEach(permission => {
                    if (hasRole.permissions[permission] || hasRole.permissions[permission] === true) {
                        allow = true;
                    }
                });
            }

            //Case to have only one permission listed
            else if (perm.includes('|')) {
                separatedPermissions = perm.split('|');
                allow = !!separatedPermissions.find(permission => {
                        return (hasRole.permissions[permission] || hasRole.permissions[permission] === true);
                    }
                );
            }

            //Case if only one permission is selected
            else if (hasRole.permissions[perm] === true) {
                allow = true;
            }

            return allow;
        }
    }

    getEndPoint(): string {
        return this.juice.getEndPoint();
    }

    setUser(user) {
        this._user = user;
    }

    setUnsavedChangesGuard(unsavedGuardValue) {
        this._unsavedChangesGuard = unsavedGuardValue;
    }

    getLanguage(): string {
        this._language = this._language || localStorage.getItem('language');
        return this._language;
    }

    getAllSystemLanguages(): Array<string> {
        const options = this.getOptions();
        if (!options || !options.languages) {
            return [];
        }
        return options.languages.map(language => language.code);
    }

    getUserLanguage(onlyCountryCode = false): string {
        const user = this.getUser();
        if (user && user.attributes && user.attributes.settings && user.attributes.settings.language) {
            if (onlyCountryCode) {
                return user.attributes.settings.language.split('_')[1];
            }

            return user.attributes.settings.language;
        }
        return null;
    }

    setLanguage(value) {
        this._language = value;
        localStorage.setItem('language', this._language);
    }

    getAutoLanguage(value: { [languageCode: string]: string } | string | number, language: string): any {
        let clearText;
        let fallback;

        if (!value) {
            return;
        }
        if (!language) {
            language = this.getLanguage();
        }
        if (value[language]) {
            clearText = value[language];
        } else {
            if (typeof value == 'string') {
                clearText = value;
            } else if (typeof value == 'number') {
                clearText = value.toString();
            } else {
                const key = Object.keys(value).find(key => value[key]);
                if (!key) {
                    return '';
                }
                fallback = key.split('_')[0].toUpperCase();
                clearText = value[key];
            }
        }

        return !!clearText ? (fallback ? `[${ fallback }]` : '') + clearText : '';
    }

    setAssetType(type) {
        this._type = type;
    }

    getAssetType() {
        return this._type;
    }

    setOptions(options: any) {
        this._options = options;
    }

    getOptions() {
        return this._options;
    }

    getProjectTitle() {
        return this._options ? (this._options.hasOwnProperty('title') ? this._options.title : null) : "JuicEbox";
    }

    getCountries(): Array<{ code: string, name: string }> {
        return this.countries.en_GB;
    }

    getCountriesByLanguage(language: string): Array<{ code: string, name: string }> {
        return this.countries[language] || this.countries.en_GB;
    }

    getUnicodeLetters() {
        return '\u00AA\u00B5\u00BA\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B4\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16F1-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2183\u2184\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005\u3006\u3031-\u3035\u303B\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6E5\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AD\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC';
    }

    slugify(text) {
        return text.toString().toLowerCase()
            .replace('&shy;', '')
            .replace(/ä/g, 'ae')
            .replace(/ö/g, 'oe')
            .replace(/ü/g, 'ue')
            .replace(/ß/g, 'ss')
            .replace(/\s+/g, '-')           // Replace spaces with -
            .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
            .replace(/\-\-+/g, '-')         // Replace multiple - with single -
            .replace(/^-+/, '')             // Trim - from start of text
            .replace(/-+$/, '');            // Trim - from end of text
    }

    /**
     * Polls the server every N seconds and logs out if the token is not valid
     */
    verify(_interval = 30000) {
        if (isDevMode()) {
            return;
        }

        if (this.polling && !this.polling.closed) {
            this.polling.unsubscribe();
        }

        this.polling = interval(_interval)
            .pipe(
                switchMap(() => this.pleaseExtendYourServiceDontDoThis().getHttpUtil().post('/juicebox/app/verify', {}))
            )
            .subscribe(
                res => {
                },
                err => this.logout()
            );
    }

    setListingHistory(key: string, data: object) {
        localStorage.setItem(`listing_history-${ key }`, JSON.stringify(data));
    }

    getListingHistory(key) {
        const history = localStorage.getItem(`listing_history-${ key }`);
        if (!history) {
            return false;
        }

        const data = JSON.parse(history);
        return data;
    }

    private showError(title: string, message: string) {
        this.showToast('error', title, message);
    }

    private showWarning(title: string, message: string){
        this.showToast('warning', title, message);
    }

    getSalutations() {
        return this.salutations[this._language] || this.salutations.en_GB;
    }

    private salutations = {
        'en_GB': [{ key: 'Mr', name: 'Mr.' }, { key: 'Mrs', name: 'Mrs.' }, { key: 'Mx', name: 'Mx.' }, { key: 'Diverse', name: 'Diverse'}],
        'de_DE': [{ key: 'Mr', name: 'Herr' }, { key: 'Mrs', name: 'Frau' }, { key: 'Mx', name: 'Mx' }, { key: 'Diverse', name: 'Divers'}],
    };

    public countries = {
        'de_DE': [
            { code: 'AF', name: 'Afghanistan' },
            { code: 'EG', name: 'Ägypten' },
            { code: 'AX', name: 'Ålandinseln' },
            { code: 'AL', name: 'Albanien' },
            { code: 'DZ', name: 'Algerien' },
            { code: 'AS', name: 'Amerikanisch-Samoa' },
            { code: 'VI', name: 'Amerikanische Jungferninseln' },
            { code: 'UM', name: 'Amerikanische Überseeinseln' },
            { code: 'AD', name: 'Andorra' },
            { code: 'AO', name: 'Angola' },
            { code: 'AI', name: 'Anguilla' },
            { code: 'AQ', name: 'Antarktis' },
            { code: 'AG', name: 'Antigua und Barbuda' },
            { code: 'GQ', name: 'Äquatorialguinea' },
            { code: 'AR', name: 'Argentinien' },
            { code: 'AM', name: 'Armenien' },
            { code: 'AW', name: 'Aruba' },
            { code: 'AZ', name: 'Aserbaidschan' },
            { code: 'ET', name: 'Äthiopien' },
            { code: 'AU', name: 'Australien' },
            { code: 'BS', name: 'Bahamas' },
            { code: 'BH', name: 'Bahrain' },
            { code: 'BD', name: 'Bangladesch' },
            { code: 'BB', name: 'Barbados' },
            { code: 'BE', name: 'Belgien' },
            { code: 'BZ', name: 'Belize' },
            { code: 'BJ', name: 'Benin' },
            { code: 'BM', name: 'Bermuda' },
            { code: 'BT', name: 'Bhutan' },
            { code: 'BO', name: 'Bolivien' },
            { code: 'BQ', name: 'Bonaire, Sint Eustatius und Saba' },
            { code: 'BA', name: 'Bosnien und Herzegowina' },
            { code: 'BW', name: 'Botsuana' },
            { code: 'BV', name: 'Bouvetinsel' },
            { code: 'BR', name: 'Brasilien' },
            { code: 'VG', name: 'Britische Jungferninseln' },
            { code: 'IO', name: 'Britisches Territorium im Indischen Ozean' },
            { code: 'BN', name: 'Brunei Darussalam' },
            { code: 'BG', name: 'Bulgarien' },
            { code: 'BF', name: 'Burkina Faso' },
            { code: 'BI', name: 'Burundi' },
            { code: 'CV', name: 'Cabo Verde' },
            { code: 'CL', name: 'Chile' },
            { code: 'CN', name: 'China' },
            { code: 'CK', name: 'Cookinseln' },
            { code: 'CR', name: 'Costa Rica' },
            { code: 'CI', name: 'Côte d’Ivoire' },
            { code: 'CW', name: 'Curaçao' },
            { code: 'DK', name: 'Dänemark' },
            { code: 'DE', name: 'Deutschland' },
            { code: 'DM', name: 'Dominica' },
            { code: 'DO', name: 'Dominikanische Republik' },
            { code: 'DJ', name: 'Dschibuti' },
            { code: 'EC', name: 'Ecuador' },
            { code: 'SV', name: 'El Salvador' },
            { code: 'ER', name: 'Eritrea' },
            { code: 'EE', name: 'Estland' },
            { code: 'SZ', name: 'Eswatini' },
            { code: 'FK', name: 'Falklandinseln' },
            { code: 'FO', name: 'Färöer' },
            { code: 'FJ', name: 'Fidschi' },
            { code: 'FI', name: 'Finnland' },
            { code: 'FR', name: 'Frankreich' },
            { code: 'GF', name: 'Französisch-Guayana' },
            { code: 'PF', name: 'Französisch-Polynesien' },
            { code: 'TF', name: 'Französische Süd- und Antarktisgebiete' },
            { code: 'GA', name: 'Gabun' },
            { code: 'GM', name: 'Gambia' },
            { code: 'GE', name: 'Georgien' },
            { code: 'GH', name: 'Ghana' },
            { code: 'GI', name: 'Gibraltar' },
            { code: 'GD', name: 'Grenada' },
            { code: 'GR', name: 'Griechenland' },
            { code: 'GL', name: 'Grönland' },
            { code: 'GP', name: 'Guadeloupe' },
            { code: 'GU', name: 'Guam' },
            { code: 'GT', name: 'Guatemala' },
            { code: 'GG', name: 'Guernsey' },
            { code: 'GN', name: 'Guinea' },
            { code: 'GW', name: 'Guinea-Bissau' },
            { code: 'GY', name: 'Guyana' },
            { code: 'HT', name: 'Haiti' },
            { code: 'HM', name: 'Heard und McDonaldinseln' },
            { code: 'HN', name: 'Honduras' },
            { code: 'IN', name: 'Indien' },
            { code: 'ID', name: 'Indonesien' },
            { code: 'IQ', name: 'Irak' },
            { code: 'IR', name: 'Iran' },
            { code: 'IE', name: 'Irland' },
            { code: 'IS', name: 'Island' },
            { code: 'IM', name: 'Isle of Man' },
            { code: 'IL', name: 'Israel' },
            { code: 'IT', name: 'Italien' },
            { code: 'JM', name: 'Jamaika' },
            { code: 'JP', name: 'Japan' },
            { code: 'YE', name: 'Jemen' },
            { code: 'JE', name: 'Jersey' },
            { code: 'JO', name: 'Jordanien' },
            { code: 'KY', name: 'Kaimaninseln' },
            { code: 'KH', name: 'Kambodscha' },
            { code: 'CM', name: 'Kamerun' },
            { code: 'CA', name: 'Kanada' },
            { code: 'KZ', name: 'Kasachstan' },
            { code: 'QA', name: 'Katar' },
            { code: 'KE', name: 'Kenia' },
            { code: 'KG', name: 'Kirgisistan' },
            { code: 'KI', name: 'Kiribati' },
            { code: 'CC', name: 'Kokosinseln' },
            { code: 'CO', name: 'Kolumbien' },
            { code: 'KM', name: 'Komoren' },
            { code: 'CG', name: 'Kongo-Brazzaville' },
            { code: 'CD', name: 'Kongo-Kinshasa' },
            { code: 'HR', name: 'Kroatien' },
            { code: 'CU', name: 'Kuba' },
            { code: 'KW', name: 'Kuwait' },
            { code: 'LA', name: 'Laos' },
            { code: 'LS', name: 'Lesotho' },
            { code: 'LV', name: 'Lettland' },
            { code: 'LB', name: 'Libanon' },
            { code: 'LR', name: 'Liberia' },
            { code: 'LY', name: 'Libyen' },
            { code: 'LI', name: 'Liechtenstein' },
            { code: 'LT', name: 'Litauen' },
            { code: 'LU', name: 'Luxemburg' },
            { code: 'MG', name: 'Madagaskar' },
            { code: 'MW', name: 'Malawi' },
            { code: 'MY', name: 'Malaysia' },
            { code: 'MV', name: 'Malediven' },
            { code: 'ML', name: 'Mali' },
            { code: 'MT', name: 'Malta' },
            { code: 'MA', name: 'Marokko' },
            { code: 'MH', name: 'Marshallinseln' },
            { code: 'MQ', name: 'Martinique' },
            { code: 'MR', name: 'Mauretanien' },
            { code: 'MU', name: 'Mauritius' },
            { code: 'YT', name: 'Mayotte' },
            { code: 'MX', name: 'Mexiko' },
            { code: 'FM', name: 'Mikronesien' },
            { code: 'MC', name: 'Monaco' },
            { code: 'MN', name: 'Mongolei' },
            { code: 'ME', name: 'Montenegro' },
            { code: 'MS', name: 'Montserrat' },
            { code: 'MZ', name: 'Mosambik' },
            { code: 'MM', name: 'Myanmar' },
            { code: 'NA', name: 'Namibia' },
            { code: 'NR', name: 'Nauru' },
            { code: 'AN', name: 'Niederländische Antillen' },
            { code: 'NP', name: 'Nepal' },
            { code: 'NC', name: 'Neukaledonien' },
            { code: 'NZ', name: 'Neuseeland' },
            { code: 'NI', name: 'Nicaragua' },
            { code: 'NL', name: 'Niederlande' },
            { code: 'NE', name: 'Niger' },
            { code: 'NG', name: 'Nigeria' },
            { code: 'NU', name: 'Niue' },
            { code: 'KP', name: 'Nordkorea' },
            { code: 'MP', name: 'Nördliche Marianen' },
            { code: 'MK', name: 'Nordmazedonien' },
            { code: 'NF', name: 'Norfolkinsel' },
            { code: 'NO', name: 'Norwegen' },
            { code: 'OM', name: 'Oman' },
            { code: 'AT', name: 'Österreich' },
            { code: 'PK', name: 'Pakistan' },
            { code: 'PS', name: 'Palästinensische Autonomiegebiete' },
            { code: 'PW', name: 'Palau' },
            { code: 'PA', name: 'Panama' },
            { code: 'PG', name: 'Papua-Neuguinea' },
            { code: 'PY', name: 'Paraguay' },
            { code: 'PE', name: 'Peru' },
            { code: 'PH', name: 'Philippinen' },
            { code: 'PN', name: 'Pitcairninseln' },
            { code: 'PL', name: 'Polen' },
            { code: 'PT', name: 'Portugal' },
            { code: 'PR', name: 'Puerto Rico' },
            { code: 'MD', name: 'Republik Moldau' },
            { code: 'RE', name: 'Réunion' },
            { code: 'RW', name: 'Ruanda' },
            { code: 'RO', name: 'Rumänien' },
            { code: 'RU', name: 'Russland' },
            { code: 'SB', name: 'Salomonen' },
            { code: 'ZM', name: 'Sambia' },
            { code: 'WS', name: 'Samoa' },
            { code: 'SM', name: 'San Marino' },
            { code: 'ST', name: 'São Tomé und Príncipe' },
            { code: 'SA', name: 'Saudi-Arabien' },
            { code: 'SE', name: 'Schweden' },
            { code: 'CH', name: 'Schweiz' },
            { code: 'SN', name: 'Senegal' },
            { code: 'SN', name: 'Senegal' },
            { code: 'RS', name: 'Serbien' },
            { code: 'SC', name: 'Seychellen' },
            { code: 'SL', name: 'Sierra Leone' },
            { code: 'ZW', name: 'Simbabwe' },
            { code: 'SG', name: 'Singapur' },
            { code: 'SK', name: 'Slowakei' },
            { code: 'SI', name: 'Slowenien' },
            { code: 'SO', name: 'Somalia' },
            { code: 'PM', name: 'St. Pierre und Miquelon' },
            { code: 'HK', name: 'Sonderverwaltungsregion Hongkong' },
            { code: 'MO', name: 'Sonderverwaltungsregion Macau' },
            { code: 'ES', name: 'Spanien' },
            { code: 'SJ', name: 'Spitzbergen und Jan Mayen' },
            { code: 'LK', name: 'Sri Lanka' },
            { code: 'BL', name: 'St. Barthélemy' },
            { code: 'SH', name: 'St. Helena' },
            { code: 'KN', name: 'St. Kitts und Nevis' },
            { code: 'LC', name: 'St. Lucia' },
            { code: 'MF', name: 'St. Martin' },
            { code: 'SX', name: 'Sint Maarten' },
            { code: 'VC', name: 'St. Vincent und die Grenadinen' },
            { code: 'ZA', name: 'Südafrika' },
            { code: 'SD', name: 'Sudan' },
            { code: 'GS', name: 'Südgeorgien und die Südlichen Sandwichinseln' },
            { code: 'KR', name: 'Südkorea' },
            { code: 'SS', name: 'Südsudan' },
            { code: 'SR', name: 'Suriname' },
            { code: 'SY', name: 'Syrien' },
            { code: 'TJ', name: 'Tadschikistan' },
            { code: 'TW', name: 'Taiwan' },
            { code: 'TZ', name: 'Tansania' },
            { code: 'TH', name: 'Thailand' },
            { code: 'TL', name: 'Timor-Leste' },
            { code: 'TG', name: 'Togo' },
            { code: 'TK', name: 'Tokelau' },
            { code: 'TO', name: 'Tonga' },
            { code: 'TT', name: 'Trinidad und Tobago' },
            { code: 'TD', name: 'Tschad' },
            { code: 'CZ', name: 'Tschechien' },
            { code: 'TN', name: 'Tunesien' },
            { code: 'TR', name: 'Türkei' },
            { code: 'TM', name: 'Turkmenistan' },
            { code: 'TC', name: 'Turks- und Caicosinseln' },
            { code: 'TV', name: 'Tuvalu' },
            { code: 'UG', name: 'Uganda' },
            { code: 'UA', name: 'Ukraine' },
            { code: 'HU', name: 'Ungarn' },
            { code: 'UY', name: 'Uruguay' },
            { code: 'UZ', name: 'Usbekistan' },
            { code: 'VU', name: 'Vanuatu' },
            { code: 'VE', name: 'Venezuela' },
            { code: 'AE', name: 'Vereinigte Arabische Emirate' },
            { code: 'US', name: 'Vereinigte Staaten' },
            { code: 'GB', name: 'Vereinigtes Königreich' },
            { code: 'VN', name: 'Vietnam' },
            { code: 'VA', name: 'Vatikanstadt' },
            { code: 'WF', name: 'Wallis und Futuna' },
            { code: 'CX', name: 'Weihnachtsinsel' },
            { code: 'EH', name: 'Westsahara' },
            { code: 'BY', name: 'Weißrussland' },
            { code: 'CF', name: 'Zentralafrikanische Republik' },
            { code: 'CY', name: 'Zypern' }
        ],
        'en_GB': [
            {
                code: 'AF', name: 'Afghanistan'
            }, {
                code: 'AL', name: 'Albania'
            }, {
                code: 'DZ', name: 'Algeria'
            }, {
                code: 'AS', name: 'American Samoa'
            }, {
                code: 'AD', name: 'Andorre'
            }, {
                code: 'AO', name: 'Angola'
            }, {
                code: 'AI', name: 'Anguilla'
            }, {
                code: 'AQ', name: 'Antarctica'
            }, {
                code: 'AG', name: 'Antigua and Barbuda'
            }, {
                code: 'AR', name: 'Argentina'
            }, {
                code: 'AM', name: 'Armenia'
            }, {
                code: 'AW', name: 'Aruba'
            }, {
                code: 'AU', name: 'Australia'
            }, {
                code: 'AT', name: 'Österreich'
            }, {
                code: 'AZ', name: 'Azerbaijan'
            }, {
                code: 'BS', name: 'Bahamas'
            }, {
                code: 'BH', name: 'Bahrain'
            }, {
                code: 'BD', name: 'Bangladesh'
            }, {
                code: 'BB', name: 'Barbade'
            }, {
                code: 'BY', name: 'Belarus'
            }, {
                code: 'BE', name: 'Belgium'
            }, {
                code: 'BZ', name: 'Belize'
            }, {
                code: 'BJ', name: 'Benin'
            }, {
                code: 'BM', name: 'Bermuda'
            }, {
                code: 'BT', name: 'Bhutan'
            }, {
                code: 'BO', name: 'Bolivia'
            }, {
                code: 'BQ', name: 'Bonaire, Sint Eustatius and Saba'
            }, {
                code: 'BA', name: 'Bosnia and Herzegovina'
            }, {
                code: 'BW', name: 'Botswana'
            }, {
                code: 'BV', name: 'Bouvet Island'
            }, {
                code: 'BR', name: 'Brazil'
            }, {
                code: 'IO', name: 'British Indian Ocean Territory'
            }, {
                code: 'VG', name: 'British Virgin Islands'
            }, {
                code: 'BN', name: 'Brunei'
            }, {
                code: 'BG', name: 'Bulgaria'
            }, {
                code: 'BF', name: 'Burkina Faso'
            }, {
                code: 'BI', name: 'Burundi'
            }, {
                code: 'KH', name: 'Cambodia'
            }, {
                code: 'CM', name: 'Cameroon'
            }, {
                code: 'CA', name: 'Canada'
            }, {
                code: 'CV', name: 'Cape Verde'
            }, {
                code: 'KY', name: 'Cayman Islands'
            }, {
                code: 'CF',
                name: 'Central African Republic'
            }, {
                code: 'TD',
                name: 'Chad'
            }, {
                code: 'CL',
                name: 'Chile'
            }, {
                code: 'CN',
                name: 'China'
            }, {
                code: 'CX',
                name: 'Christmas Island'
            }, {
                code: 'CC',
                name: 'Cocos (Keeling) Islands'
            }, {
                code: 'CO',
                name: 'Colombia'
            }, {
                code: 'KM',
                name: 'Comoros'
            }, {
                code: 'CG',
                name: 'Congo'
            }, {
                code: 'CD',
                name: 'Congo (Dem. Rep.)'
            }, {
                code: 'CK',
                name: 'Cook Islands'
            }, {
                code: 'CR',
                name: 'Costa Rica'
            }, {
                code: 'ME',
                name: 'Crna Gora'
            }, {
                code: 'HR',
                name: 'Croatia'
            }, {
                code: 'CU',
                name: 'Cuba'
            }, {
                code: 'CW',
                name: 'Curaçao'
            }, {
                code: 'CY',
                name: 'Cyprus'
            }, {
                code: 'CZ',
                name: 'Czech Republic'
            }, {
                code: 'CI', name: 'Côte D\'Ivoire'
            }, {
                code: 'DK', name: 'Denmark'
            }, {
                code: 'DJ', name: 'Djibouti'
            }, {
                code: 'DM', name: 'Dominica'
            }, {
                code: 'DO', name: 'Dominican Republic'
            }, {
                code: 'TL', name: 'East Timor'
            }, {
                code: 'EC', name: 'Ecuador'
            }, {
                code: 'EG', name: 'Egypt'
            }, {
                code: 'SV', name: 'El Salvador'
            }, {
                code: 'GQ', name: 'Equatorial Guinea'
            }, {
                code: 'ER', name: 'Eritrea'
            }, {
                code: 'EE', name: 'Estonia'
            }, {
                code: 'ET', name: 'Ethiopia'
            }, {
                code: 'FK', name: 'Falkland Islands'
            }, {
                code: 'FO', name: 'Faroe Islands'
            }, {
                code: 'FJ', name: 'Fiji'
            }, {
                code: 'FI', name: 'Finland'
            }, {
                code: 'FR', name: 'France'
            }, {
                code: 'GF', name: 'French Guiana'
            }, {
                code: 'PF', name: 'French Polynesia'
            }, {
                code: 'TF', name: 'French Southern Territories'
            }, {
                code: 'GA', name: 'Gabon'
            }, {
                code: 'GM', name: 'Gambia'
            }, {
                code: 'GE', name: 'Georgia'
            }, {
                code: 'DE', name: 'Germany'
            }, {
                code: 'GH', name: 'Ghana'
            }, {
                code: 'GI', name: 'Gibraltar'
            }, {
                code: 'GR', name: 'Greece'
            }, {
                code: 'GL', name: 'Greenland'
            }, {
                code: 'GD', name: 'Grenada'
            }, {
                code: 'GP', name: 'Guadeloupe'
            }, {
                code: 'GU', name: 'Guam'
            }, {
                code: 'GT', name: 'Guatemala'
            }, {
                code: 'GG', name: 'Guernsey and Alderney'
            }, {
                code: 'GN', name: 'Guinea'
            }, {
                code: 'GW', name: 'Guinea-Bissau'
            }, {
                code: 'GY', name: 'Guyana'
            }, {
                code: 'HT', name: 'Haiti'
            }, {
                code: 'HM', name: 'Heard and McDonald Islands'
            }, {
                code: 'HN', name: 'Honduras'
            }, {
                code: 'HK', name: 'Hong Kong'
            }, {
                code: 'HU', name: 'Hungary'
            }, {
                code: 'IS', name: 'Iceland'
            }, {
                code: 'IN', name: 'India'
            }, {
                code: 'ID', name: 'Indonesia'
            }, {
                code: 'IR', name: 'Iran'
            }, {
                code: 'IQ', name: 'Iraq'
            }, {
                code: 'IE', name: 'Ireland'
            }, {
                code: 'IM', name: 'Isle of Man'
            }, {
                code: 'IL', name: 'Israel'
            }, {
                code: 'IT', name: 'Italy'
            }, {
                code: 'JM', name: 'Jamaica'
            }, {
                code: 'JP', name: 'Japan'
            }, {
                code: 'JE', name: 'Jersey'
            }, {
                code: 'JO', name: 'Jordan'
            }, {
                code: 'KZ', name: 'Kazakhstan'
            }, {
                code: 'KE', name: 'Kenya'
            }, {
                code: 'KI', name: 'Kiribati'
            }, {
                code: 'KP', name: 'Korea (North)'
            }, {
                code: 'KR', name: 'Korea (South)'
            }, {
                code: 'KW', name: 'Kuwait'
            }, {
                code: 'KG', name: 'Kyrgyzstan'
            }, {
                code: 'LA', name: 'Laos'
            }, {
                code: 'LV', name: 'Latvia'
            }, {
                code: 'LB', name: 'Lebanon'
            }, {
                code: 'LS', name: 'Lesotho'
            }, {
                code: 'LR', name: 'Liberia'
            }, {
                code: 'LY', name: 'Libya'
            }, {
                code: 'LI', name: 'Liechtenstein'
            }, {
                code: 'LT', name: 'Lithuania'
            }, {
                code: 'LU', name: 'Luxembourg'
            }, {
                code: 'MO', name: 'Macao'
            }, {
                code: 'MK', name: 'Macedonia'
            }, {
                code: 'MG', name: 'Madagascar'
            }, {
                code: 'MW', name: 'Malawi'
            }, {
                code: 'MY', name: 'Malaysia'
            }, {
                code: 'MV', name: 'Maldives'
            }, {
                code: 'ML', name: 'Mali'
            }, {
                code: 'MT', name: 'Malta'
            }, {
                code: 'MH', name: 'Marshall Islands'
            }, {
                code: 'MQ', name: 'Martinique'
            }, {
                code: 'MR', name: 'Mauritania'
            }, {
                code: 'MU', name: 'Mauritius'
            }, {
                code: 'YT', name: 'Mayotte'
            }, {
                code: 'MX', name: 'Mexico'
            }, {
                code: 'FM', name: 'Micronesia'
            }, {
                code: 'MD', name: 'Moldova'
            }, {
                code: 'MC', name: 'Monaco'
            }, {
                code: 'MN', name: 'Mongolia'
            }, {
                code: 'MS', name: 'Montserrat'
            }, {
                code: 'MA', name: 'Morocco'
            }, {
                code: 'MZ', name: 'Mozambique'
            }, {
                code: 'MM', name: 'Myanmar'
            }, {
                code: 'NA', name: 'Namibia'
            }, {
                code: 'NR', name: 'Nauru'
            }, {
                code: 'NP', name: 'Nepal'
            }, {
                code: 'NL', name: 'Netherlands'
            }, {
                code: 'AN', name: 'Netherlands Antilles'
            }, {
                code: 'NC', name: 'New Caledonia'
            }, {
                code: 'NZ', name: 'New Zealand'
            }, {
                code: 'NI', name: 'Nicaragua'
            }, {
                code: 'NE', name: 'Niger'
            }, {
                code: 'NG', name: 'Nigeria'
            }, {
                code: 'NU', name: 'Niue'
            }, {
                code: 'NF', name: 'Norfolk Island'
            }, {
                code: 'MP', name: 'Northern Mariana Islands'
            }, {
                code: 'NO', name: 'Norway'
            }, {
                code: 'OM', name: 'Oman'
            }, {
                code: 'PK', name: 'Pakistan'
            }, {
                code: 'PW', name: 'Palau'
            }, {
                code: 'PS', name: 'Palestine'
            }, {
                code: 'PA', name: 'Panama'
            }, {
                code: 'PG', name: 'Papua New Guinea'
            }, {
                code: 'PY', name: 'Paraguay'
            }, {
                code: 'PE', name: 'Peru'
            }, {
                code: 'PH', name: 'Philippines'
            }, {
                code: 'PN', name: 'Pitcairn'
            }, {
                code: 'PL', name: 'Poland'
            }, {
                code: 'PT', name: 'Portugal'
            }, {
                code: 'PR', name: 'Puerto Rico'
            }, {
                code: 'QA', name: 'Qatar'
            }, {
                code: 'RO', name: 'Romania'
            }, {
                code: 'RU', name: 'Russia'
            }, {
                code: 'RW', name: 'Rwanda'
            }, {
                code: 'RE', name: 'Réunion'
            }, {
                code: 'BL', name: 'Saint Barthélemy'
            }, {
                code: 'SH', name: 'Saint Helena'
            }, {
                code: 'KN', name: 'Saint Kitts and Nevis'
            }, {
                code: 'LC', name: 'Saint Lucia'
            }, {
                code: 'MF', name: 'Saint Martin'
            }, {
                code: 'PM', name: 'Saint Pierre and Miquelon'
            }, {
                code: 'VC', name: 'Saint Vincent and the Grenadines'
            }, {
                code: 'WS', name: 'Samoa'
            }, {
                code: 'SM', name: 'San Marino'
            }, {
                code: 'SA', name: 'Saudi Arabia'
            }, {
                code: 'SN', name: 'Senegal'
            }, {
                code: 'RS', name: 'Serbia'
            }, {
                code: 'SC', name: 'Seychelles'
            }, {
                code: 'SL', name: 'Sierra Leone'
            }, {
                code: 'SG', name: 'Singapore'
            }, {
                code: 'SX', name: 'Sint Maarten'
            }, {
                code: 'SK', name: 'Slovakia'
            }, {
                code: 'SI', name: 'Slovenia'
            }, {
                code: 'SB', name: 'Solomon Islands'
            }, {
                code: 'SO', name: 'Somalia'
            }, {
                code: 'ZA', name: 'South Africa'
            }, {
                code: 'GS', name: 'South Georgia and the South Sandwich Islands'
            }, {
                code: 'SS', name: 'South Sudan'
            }, {
                code: 'ES', name: 'Spain'
            }, {
                code: 'LK', name: 'Sri Lanka'
            }, {
                code: 'SD', name: 'Sudan'
            }, {
                code: 'SR', name: 'Suriname'
            }, {
                code: 'SJ', name: 'Svalbard and Jan Mayen'
            }, {
                code: 'SZ', name: 'Swaziland'
            }, {
                code: 'SE', name: 'Sweden'
            }, {
                code: 'CH', name: 'Switzerland'
            }, {
                code: 'SY', name: 'Syria'
            }, {
                code: 'ST', name: 'São Tomé and Príncipe'
            }, {
                code: 'TW', name: 'Taiwan'
            }, {
                code: 'TJ', name: 'Tajikistan'
            }, {
                code: 'TZ', name: 'Tanzania'
            }, {
                code: 'TH', name: 'Thailand'
            }, {
                code: 'TG', name: 'Togo'
            }, {
                code: 'TK', name: 'Tokelau'
            }, {
                code: 'TO', name: 'Tonga'
            }, {
                code: 'TT', name: 'Trinidad and Tobago'
            }, {
                code: 'TN', name: 'Tunisia'
            }, {
                code: 'TR', name: 'Turkey'
            }, {
                code: 'TM', name: 'Turkmenistan'
            }, {
                code: 'TC', name: 'Turks and Caicos Islands'
            }, {
                code: 'TV', name: 'Tuvalu'
            }, {
                code: 'UG', name: 'Uganda'
            }, {
                code: 'UA', name: 'Ukraine'
            }, {
                code: 'AE', name: 'United Arab Emirates'
            }, {
                code: 'GB', name: 'United Kingdom'
            }, {
                code: 'UM', name: 'United States Minor Outlying Islands'
            }, {
                code: 'US', name: 'United States of America'
            }, {
                code: 'UY', name: 'Uruguay'
            }, {
                code: 'UZ', name: 'Uzbekistan'
            }, {
                code: 'VU', name: 'Vanuatu'
            }, {
                code: 'VA', name: 'Vatican City'
            }, {
                code: 'VE', name: 'Venezuela'
            }, {
                code: 'VN', name: 'Vietnam'
            }, {
                code: 'VI', name: 'Virgin Islands of the United States'
            }, {
                code: 'WF', name: 'Wallis and Futuna'
            }, {
                code: 'EH', name: 'Western Sahara'
            }, {
                code: 'YE', name: 'Yemen'
            }, {
                code: 'ZM', name: 'Zambia'
            }, {
                code: 'ZW', name: 'Zimbabwe'
            }, {
                code: 'AX', name: 'Åland Islands'
            }
        ]
    }

    getTypeFor(name: string): Type<any> {
        return this.registry.get(name);
    }
    register(name: string, componentClass: Type<any>): void {
        this.registry.set(name, componentClass);
    }

  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
