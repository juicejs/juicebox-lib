import {Component, Inject, OnInit} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { JuiceboxService} from '../../../shared/services/Juicebox.service';
import { WelcomeMessageComponent } from './welcome-message/welcome-message.component';
import { AutoLanguagePipe} from '../../../shared/pipes/auto-language.pipe';
import { ConfigurationService} from '../../../shared/services/configuration.service';
import { Title } from '@angular/platform-browser';
import { MainTranslationPipe } from '../i18n/main.translation';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

    loginForm: FormGroup;
    returnUrl: string;
    organisations: Array<{ _id: string, name: string }> = [];
    version: { frontend: string, backend: string };
    twoFactorAuthTimestamp: number = 0;
    privacyPolicyLink: string = 'cse_privacy_policy_link';

    errorMessage: string = null;
    org: boolean = false;
    promiseBtn: any;

    organisation: any;

    autoLanguagePipe: AutoLanguagePipe;
    mainTranslationPipe: MainTranslationPipe;

    constructor(private titleService: Title,
        private router: Router,
        public dialog: MatDialog,
        private route: ActivatedRoute,
        private configuration: ConfigurationService,
        public juicebox: JuiceboxService) {
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
                    this.org = true;
                    this.organisations = [...(<any>success).organisations];
                } else {
                    document.location.replace('');
                }
            }
        })();
    }

    login() {
        this.promiseBtn = (async () => {
            this.errorMessage = null;

            const result: any = await this.juicebox.auth(
                'juicebox:user',
                {
                    email: this.loginForm.value.email,
                    password: this.loginForm.value.password,
                    remember: this.loginForm.value.remember,
                    legalAgreement: this.legalAgreementValue,
                },
                this.loginForm.value.organisation_id,
                {
                    code: this.loginForm.value.two_factor_authorisation_code,
                    timestamp: this.twoFactorAuthTimestamp
                }
            );

            if (!result || !result.success) {
                this.handleError(result.error);
                return;
            }

            if (result.organisations && result.organisations.length) {
                this.org = true;
                this.organisations = [...result.organisations];
                this.organisation = this.organisations[0]._id;
            } else if (result.twoFactor && result.twoFactor.strategy && result.twoFactor.timestamp) {
                //Open field to confirm two factor auth
                this.twoFactorAuthTimestamp = result.twoFactor.timestamp;
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
        if (this.loginForm.invalid || !this.loginForm.value.organisation_id) return;

        this.promiseBtn = (async () => {
            this.errorMessage = null;

            const result = await this.juicebox.auth('juicebox:user', {
                email: this.loginForm.value.email,
                password: this.loginForm.value.password,
                remember: this.loginForm.value.remember
            }, this.loginForm.value.organisation_id);

            if (result && result.success) {
                if (result.twoFactor && result.twoFactor.strategy && result.twoFactor.timestamp) {
                    //Remove org dropdown
                    this.org = false;
                    //Open field to confirm two factor auth
                    this.twoFactorAuthTimestamp = result.twoFactor.timestamp;
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
        dialogRef.afterClosed().subscribe(result => {
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


    async loginWithWeb3() {
        console.log('Creating the token...');
        const win: any = this.juicebox.getWindow();

        const ethEnabled = async () => {
            if (win.ethereum) {
                await win.ethereum.request({method: 'eth_requestAccounts'});
                // @ts-ignore
                win.web3 = new Web3(win.ethereum);
                return true;
            }
            return false;
        };
        await ethEnabled();


        // @ts-ignore
        const web3 = win.web3;
        const address = await web3.eth.getAccounts();
        console.log(address);

        const message = 'Web3 login for ' + this.juicebox.getProjectTitle() + '\n' +
            'This request will not trigger a blockchain transaction or cost any gas fees.' +
            'You will be authorized with your Wallet for 24 hours.\n' +
            'Wallet address:\n' + address[0];

        await web3.eth.personal.sign(message, address[0], async (error, signature) => {
            if (error) {
                console.error(error);
                return;
            }
            console.log(`New token created! (${address})`);

            const result: any = await this.juicebox.auth(
                'juicebox:wallet',
                {
                    signature: signature,
                    message: message
                }
            );

            if (result.success) {
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
            } else {
                this.handleError(result.error);
                this.errorMessage = "Web3 Authentication Failed";
            }
        });
    }

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
            await dialogRef.afterClosed().toPromise();
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

    legalAgreementUIShown = false; // specific to CS Equipments project
    legalAgreementValue: boolean; // specific to CS Equipments project

    private errorHandlerMap: { [errMsg: string]: () => any } = {
        LEGAL_AGREEMENT_NOT_ACCEPTED: () => {
            this.errorMessage = 'LEGAL_AGREEMENT_NOT_ACCEPTED';
            this.legalAgreementUIShown = true;
        },
        DEFAULT: () => {
            this.errorMessage = 'wrong_credentials';
        },
        WEB3: () => {
            this.errorMessage = 'wallet_authorization_failed';
        }
    }
}
