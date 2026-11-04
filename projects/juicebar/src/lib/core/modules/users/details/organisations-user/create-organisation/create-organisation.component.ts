import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { UsersService } from '../../../users.service';
import { UserTranslationPipe } from '../../../i18n/user.translation';
import { JuiceboxService } from '../../../../../shared/services/Juicebox.service';
import { ConfigurationService } from '../../../../../shared/services/configuration.service';
import { SHARED_IMPORTS } from '../../../../../shared/shared-imports';

/**
 * Creates an organisation (an entity of type `organisation`) with the fields of the old entity wizard's
 * organisation form. Closes with the created organisation, or nothing when cancelled.
 */
@Component({
    selector: 'app-create-organisation',
    templateUrl: './create-organisation.component.html',
    styleUrls: ['./create-organisation.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        SHARED_IMPORTS,
        UserTranslationPipe
    ]
})
export class CreateOrganisationComponent {

    private dialogRef = inject<DialogRef<any>>(DialogRef);
    private usersService = inject(UsersService);
    private configurationService = inject(ConfigurationService);
    private juicebox = inject(JuiceboxService);
    private i18n = new UserTranslationPipe(this.juicebox);

    protected readonly countries = this.juicebox.getCountriesByLanguage(this.juicebox.getLanguage());
    protected promiseBtn: Promise<unknown> | null = null;

    protected readonly form = new FormGroup({
        name: new FormControl('', Validators.required),
        taxNumber: new FormControl(''),
        phone: new FormControl(''),
        mobilephone: new FormControl(''),
        street: new FormControl(''),
        street2: new FormControl(''),
        postcode: new FormControl(''),
        city: new FormControl(''),
        country: new FormControl('')
    });

    create() {
        this.form.markAllAsTouched();
        if (this.form.invalid) return;

        this.promiseBtn = (async () => {
            const { street, street2, postcode, city, country, ...fields } = this.form.getRawValue();
            const data: any = {
                ...fields,
                type: 'organisation',
                address: { type: 'business', name: fields.name, street, street2, postcode, city, country }
            };
            if (await this.isProtectedByDefault()) data.protected = true;

            const result = await this.usersService.createEntity(data);
            if (!result?.success) {
                const translated = result?.error ? this.i18n.transform(result.error) : '';
                this.juicebox.showToast('error', translated && !translated.startsWith('@')
                    ? translated
                    : result?.error || this.i18n.transform('error_creating_organisation'));
                return;
            }

            this.juicebox.showToast('success', this.i18n.transform('organisation_created'));
            this.dialogRef.close(result.payload);
        })();
    }

    cancel() {
        this.dialogRef.close();
    }

    /** As in the old entity wizard: entities:juicebox:settings can make new entities protected */
    private async isProtectedByDefault(): Promise<boolean> {
        const result = await this.configurationService.getByKey('entities:juicebox:settings');
        return !!result?.payload?.options?.default_protected_value;
    }
}
