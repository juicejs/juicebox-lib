import {Component, inject, OnInit, ChangeDetectionStrategy, signal} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DialogService } from '../../../../ui-components';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { JuiceboxService} from '../../../shared/services/Juicebox.service';
import { WelcomeMessageComponent } from './welcome-message/welcome-message.component';
import { AutoLanguagePipe} from '../../../shared/pipes/auto-language.pipe';
import { ConfigurationService} from '../../../shared/services/configuration.service';
import { Title } from '@angular/platform-browser';
import { MainTranslationPipe } from '../i18n/main.translation';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import {SharedModule} from '../../../shared/shared.module';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        NgOptimizedImage,
        ReactiveFormsModule,
        SharedModule,
        MainTranslationPipe,
        AutoLanguagePipe
    ]
})
export class LoginComponent implements OnInit {

    loginForm: FormGroup;
    returnUrl: string;
    organisations = signal<Array<{ _id: string, name: string }>>([]);
    version: { frontend: string, backend: string };
    twoFactorAuthTimestamp = signal(0);
    privacyPolicyLink: string = 'cse_privacy_policy_link';

    errorMessage = signal<string | null>(null);
    org = signal(false);
    legalAgreementUIShown = signal(false);
    legalAgreementValue = signal(false);
    promiseBtn: any;

    organisation: any;

    autoLanguagePipe: AutoLanguagePipe;
    mainTranslationPipe: MainTranslationPipe;

    private titleService = inject(Title);
    private router = inject(Router);
    public dialog = inject(DialogService);
    private route = inject(ActivatedRoute);
    private configuration = inject(ConfigurationService);
    public juicebox = inject(JuiceboxService);

    constructor() {
      this.autoLanguagePipe = new AutoLanguagePipe(this.juicebox);
      this.mainTranslationPipe = new MainTranslationPipe(this.juicebox);
    }

    async ngOnInit() {
        this.loginForm = new FormGroup({
            email: new FormControl(null, Validators.required),
            password: new FormControl(null, Validators.required),
            remember: new FormControl(false),
            organisation_id: new FormControl(null),
            two_factor_authorisation_code: new FormControl(null)
        })

        this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
        if (this.juicebox.isLoggedIn()) {
            let redirectUrl;
            if (this.juicebox.getEndPoint().indexOf('localhost') != -1)
                redirectUrl = '/';
            else {
                const juicebox = await this.configuration.getByKey('juicebox');
                if (juicebox?.payload?.options?.redirectUrl)
                    redirectUrl = juicebox.payload.options.redirectUrl;
                else redirectUrl = '/backend/';
            }
            window.location.href = redirectUrl;
        }

        this.fetchVersionData();
        this.setTitle();

        // TODO ADD PRODUCTION URL
        if (this.juicebox.getEndPoint() === 'https://assets-staging.quality-circle.com') {
            let favicon = document.querySelector('link[rel="icon"]');
            favicon?.setAttribute('href', 'assets/favicon-qc.ico');
            this.privacyPolicyLink = 'mbt_privacy_policy_link';
        }
    }

    private setTitle() {
        this.juicebox.getLocalJsonFile('config.json').then(result => {
            this.titleService.setTitle(result.title);
        }).catch(error => {
            console.log("Warning", "Please set application title in config.json");
        });
    }

    loginJuicEchain(authentication) {
        this.promiseBtn = (async () => {
            const success = await this.juicebox.auth('juicebox:wallet', {
                authentication: authentication
            }, null);

            if ((<any>success).success) {
                if ((<any>success).organisations) {
                    this.org.set(true);
                    this.organisations.set([...(<any>success).organisations]);
                } else {
                    document.location.replace('');
                }
            }
        })();
    }

    login() {
        this.loginForm.markAllAsTouched();
        if (!this.loginForm.value.email || !this.loginForm.value.password) {
            this.errorMessage.set('fields_required');
            return;
        }
        this.promiseBtn = (async () => {
            this.errorMessage.set(null);

            const result: any = await this.juicebox.auth(
                'juicebox:user',
                {
                    email: this.loginForm.value.email,
                    password: this.loginForm.value.password,
                    remember: this.loginForm.value.remember,
                    legalAgreement: this.legalAgreementValue(),
                },
                this.loginForm.value.organisation_id,
                {
                    code: this.loginForm.value.two_factor_authorisation_code,
                    timestamp: this.twoFactorAuthTimestamp()
                }
            );

            if (!result || !result.success) {
                this.handleError(result.error);
                return;
            }

            if (result.organisations && result.organisations.length) {
                this.org.set(true);
                this.organisations.set([...result.organisations]);
                this.organisation = this.organisations()[0]._id;
                this.loginForm.patchValue({ organisation_id: this.organisation });
            } else if (result.twoFactor && result.twoFactor.strategy && result.twoFactor.timestamp) {
                //Open field to confirm two factor auth
                this.twoFactorAuthTimestamp.set(result.twoFactor.timestamp);
            }
            else {
                const accepted = await this.showWelcomeDialogue(result.welcomeMessageKey);

                // check if 2fa options are available and redirect user to activate 2fa
                const config = await this.configuration.getByKey("juicebox");
                const options = config.payload.options || {};

                if (accepted && config.success && options.twoFactor && options.twoFactor.length && !result.hasTwoFactor) {
                    localStorage.setItem("2fawarning", this.mainTranslationPipe.transform('set_two_factor'))
                    document.location.replace('');
                    return;
                }

                if (accepted) document.location.replace('');
            }
        })();
    }

    loginWithOrg() {
        this.loginForm.markAllAsTouched();
        if (!this.loginForm.value.email || !this.loginForm.value.password || !this.loginForm.value.organisation_id) {
            this.errorMessage.set('fields_required');
            return;
        }

        this.promiseBtn = (async () => {
            this.errorMessage.set(null);

            const result = await this.juicebox.auth('juicebox:user', {
                email: this.loginForm.value.email,
                password: this.loginForm.value.password,
                remember: this.loginForm.value.remember
            }, this.loginForm.value.organisation_id);

            if (result && result.success) {
                if (result.twoFactor && result.twoFactor.strategy && result.twoFactor.timestamp) {
                    //Remove org dropdown
                    this.org.set(false);
                    //Open field to confirm two factor auth
                    this.twoFactorAuthTimestamp.set(result.twoFactor.timestamp);
                } else {
                    if (result.user?.attributes?.settings?.language) {
                        this.juicebox.setLanguage(result.user.attributes.settings.language)
                    }
                    const accepted = await this.showWelcomeDialogue(result.welcomeMessageKey);

                    // check if 2fa options are available and redirect user to activate 2fa
                    const config = await this.configuration.getByKey("juicebox");
                    const options = config.payload.options || {};
                    if (accepted && config.success && options.twoFactor && options.twoFactor.length && !result.hasTwoFactor) {
                        localStorage.setItem("2fawarning", this.mainTranslationPipe.transform('set_two_factor'))
                        document.location.replace('');
                        return;
                    }

                    if (accepted) document.location.replace('');
                }
            } else {
                this.handleError(result.error);
            }
        })();
    }

    forgotPassword() {
        const dialogRef = this.dialog.open(ForgotPasswordComponent, { 
            width: '500px',
            disableClose: false
        });
        dialogRef.closed.subscribe(result => {
            if (result) {
                console.log('success');
            }
        });
    }

    fetchVersionData() {
        this.juicebox.getLocalJsonFile('version.json').then(result => {
            this.version = result;
        }).catch(error => {
            this.version = null;
        });
    }


    // COMMENTED: Web3 login functionality disabled
    // private web3ScriptsLoaded = false;
    //
    // private loadWeb3Scripts(): Promise<void> {
    //     if (this.web3ScriptsLoaded) return Promise.resolve();
    //     const sources = [
    //         'https://unpkg.com/web3@1.8.1/dist/web3.min.js',
    //         'https://unpkg.com/web3modal@1.9.5/dist/index.js',
    //         'https://unpkg.com/evm-chains@0.2.0/dist/umd/index.min.js',
    //         'https://unpkg.com/@walletconnect/web3-provider@1.6.6/dist/umd/index.min.js'
    //     ];
    //     return Promise.all(sources.map(src => new Promise<void>((resolve, reject) => {
    //         if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    //         const s = document.createElement('script');
    //         s.src = src;
    //         s.async = true;
    //         s.onload = () => resolve();
    //         s.onerror = () => reject(new Error(`Failed to load ${src}`));
    //         document.head.appendChild(s);
    //     }))).then(() => { this.web3ScriptsLoaded = true; });
    // }
    //
    // async loginWithWeb3() {
    //     await this.loadWeb3Scripts();
    //     console.log('Creating the token...');
    //     const win: any = this.juicebox.getWindow();
    //
    //     const ethEnabled = async () => {
    //         if (win.ethereum) {
    //             await win.ethereum.request({method: 'eth_requestAccounts'});
    //             // @ts-ignore
    //             win.web3 = new Web3(win.ethereum);
    //             return true;
    //         }
    //         return false;
    //     };
    //     await ethEnabled();
    //
    //
    //     // @ts-ignore
    //     const web3 = win.web3;
    //     const address = await web3.eth.getAccounts();
    //     console.log(address);
    //
    //     const message = 'Web3 login for ' + this.juicebox.getProjectTitle() + '\n' +
    //         'This request will not trigger a blockchain transaction or cost any gas fees.' +
    //         'You will be authorized with your Wallet for 24 hours.\n' +
    //         'Wallet address:\n' + address[0];
    //
    //     await web3.eth.personal.sign(message, address[0], async (error, signature) => {
    //         if (error) {
    //             console.error(error);
    //             return;
    //         }
    //         console.log(`New token created! (${address})`);
    //
    //         const result: any = await this.juicebox.auth(
    //             'juicebox:wallet',
    //             {
    //                 signature: signature,
    //                 message: message
    //             }
    //         );
    //
    //         if (result.success) {
    //             const accepted = await this.showWelcomeDialogue(result.welcomeMessageKey);
    //
    //             // check if 2fa options are available and redirect user to activate 2fa
    //             const config = await this.configuration.getByKey("juicebox");
    //             const options = config.payload.options || {};
    //
    //             if (accepted && config.success && options.twoFactor && options.twoFactor.length && !result.hasTwoFactor) {
    //                 localStorage.setItem("2fawarning", this.mainTranslationPipe.transform('set_two_factor'))
    //                 document.location.replace('');
    //                 return;
    //             }
    //
    //             if (accepted) document.location.replace('');
    //         } else {
    //             this.handleError(result.error);
    //             this.errorMessage.set("Web3 Authentication Failed");
    //         }
    //     });
    // }

    async showWelcomeDialogue(welcomeMessageKey): Promise<boolean> {
        const result = await this.configuration.getByKey('juicebox:welcome-message');
        if (result.success && result.payload && result.payload.options && result.payload.options.message) {
            let message;
            if (welcomeMessageKey) {
                message = result.payload.options.message[welcomeMessageKey];
            } else {
                message = this.autoLanguagePipe.transform(result.payload.options.message);
            }
            const dialogRef = this.dialog.open(WelcomeMessageComponent, { 
                disableClose: true,
                data: { message: message }
            });
            await dialogRef.closed.toPromise();
            return true;
        }
        return true;
    }

    private handleError(errMsg: string) {
        const errHandler = this.errorHandler(errMsg);
        errHandler();
    }

    private errorHandler(errMsg: string): () => any {
        if (!errMsg || !this.errorHandlerMap[errMsg]) {
            return this.errorHandlerMap['DEFAULT'];
        }

        return this.errorHandlerMap[errMsg];
    }

    private errorHandlerMap: { [errMsg: string]: () => any } = {
        LEGAL_AGREEMENT_NOT_ACCEPTED: () => {
            this.errorMessage.set('LEGAL_AGREEMENT_NOT_ACCEPTED');
            this.legalAgreementUIShown.set(true);
        },
        DEFAULT: () => {
            this.errorMessage.set('wrong_credentials');
        },
        // WEB3: () => {
        //     this.errorMessage.set('wallet_authorization_failed');
        // }
    }
}
