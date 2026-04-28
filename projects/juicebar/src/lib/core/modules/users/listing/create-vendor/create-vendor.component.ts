import {Component, OnInit, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormControl, FormGroup, Validators, ReactiveFormsModule} from '@angular/forms';
import {Router} from '@angular/router';
import {DialogRef} from '@angular/cdk/dialog';
import {ConfigurationService} from '../../../../shared/services/configuration.service';
import {UsersService} from '../../users.service';
import {UserTranslationPipe} from '../../i18n/user.translation';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {SharedModule} from '../../../../shared/shared.module';


@Component({
    selector: 'create-vendor',
    templateUrl: './create-vendor.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        SharedModule,
        UserTranslationPipe
    ]
})
export class CreateVendorComponent implements OnInit {

    public createVendorForm: FormGroup;
    public updatePromise = null;
    public organisation: any;
    public countries: Array<any> = [];
    public key: string;
    public language: any;
    private i18n: UserTranslationPipe;

    constructor(private router: Router,
                private usersService: UsersService,
                public dialogRef: DialogRef<any>,
                public configurationService: ConfigurationService,
                public juicebox: JuiceboxService) {

        this.createVendorForm = new FormGroup({
            street: new FormControl(''),
            postcode: new FormControl(''),
            city: new FormControl(''),
            country: new FormControl(''),
            name: new FormControl('', Validators.required),
            firstname: new FormControl('', Validators.required),
            email: new FormControl('', [Validators.required, Validators.email]),
            lastname: new FormControl('', Validators.required),
            nickname:new FormControl('', Validators.nullValidator)
        });

    }

    async ngOnInit() {
        console.log(this.countries)

        this.language = this.juicebox.getLanguage();
        this.i18n = new UserTranslationPipe(this.juicebox);
        this.countries = this.juicebox.getCountriesByLanguage(this.language);

    }


    create() {
        this.createVendorForm.markAllAsTouched();
        if (this.createVendorForm.invalid) return;

        this.updatePromise = (async () => {
            const result = await this.usersService.createVendor(this.createVendorForm.value);
            if (result.success) {
                this.juicebox.showToast("success", this.i18n.transform('vendor_created'));
                return this.dialogRef.close(result);
            } else {
                this.juicebox.showToast("error", this.i18n.transform(result.error));
            }
        })();
    }


    public cancel() {
        this.dialogRef.close(null);
    }

    public search(search: string): boolean {
        return true;
    }
    // TODO implement unsavedChanges
}
