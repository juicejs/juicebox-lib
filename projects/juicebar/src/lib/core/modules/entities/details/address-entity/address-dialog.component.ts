import {Component, inject, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {DialogRef} from '@angular/cdk/dialog';
import {
  ButtonComponent,
  DIALOG_DATA,
  DialogActionsComponent,
  DialogContentComponent,
  DialogTitleComponent,
  ErrorComponent,
  FormFieldComponent,
  InputDirective,
  LabelComponent,
  OptionComponent,
  SelectComponent,
} from '../../../../../ui-components';
import {PromiseButtonDirective} from '../../../../shared/directives/PromiseButton';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {EntitiesService} from '../../entities.service';
import {EntityAddress} from '../../entities.types';
import {ADDRESS_TYPES} from '../../entity-form';
import {EntitiesTranslationPipe} from '../../i18n/entities.translation';

export interface AddressDialogData {
  entityId: string;
  /** The address to change; without it the dialog adds one */
  address?: EntityAddress;
}

/**
 * Adds an address to a customer ("Address wizard") or changes one ("Edit address", which also has the second street
 * line). The type, street, postcode, city and country are required and tell so once the button was pressed without
 * them. Closes with `true` once the address is stored; a refusal shows the backend's reason and keeps the dialog.
 */
@Component({
  selector: 'app-address-dialog',
  templateUrl: './address-dialog.component.html',
  imports: [
    ReactiveFormsModule,
    DialogTitleComponent,
    DialogContentComponent,
    DialogActionsComponent,
    FormFieldComponent,
    LabelComponent,
    ErrorComponent,
    InputDirective,
    SelectComponent,
    OptionComponent,
    ButtonComponent,
    PromiseButtonDirective,
    EntitiesTranslationPipe,
  ],
  providers: [EntitiesTranslationPipe],
})
export class AddressDialogComponent {
  private readonly entities = inject(EntitiesService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);
  private readonly data = inject<AddressDialogData>(DIALOG_DATA);
  private readonly i18n = inject(EntitiesTranslationPipe);

  protected readonly address = this.data.address;
  protected readonly countries = this.juicebox.getCountriesByLanguage(this.juicebox.getLanguage());
  protected readonly types = ADDRESS_TYPES.map(value => ({value, label: this.i18n.transform(value)}));
  protected readonly form = new FormGroup({
    type: new FormControl(this.address?.type || '', {nonNullable: true, validators: Validators.required}),
    name: new FormControl(this.address?.name || '', {nonNullable: true}),
    street: new FormControl(this.address?.street || '', {nonNullable: true, validators: Validators.required}),
    street2: new FormControl(this.address?.street2 || '', {nonNullable: true}),
    postcode: new FormControl(this.address?.postcode || '', {nonNullable: true, validators: Validators.required}),
    city: new FormControl(this.address?.city || '', {nonNullable: true, validators: Validators.required}),
    // A stored country the admin's list does not have is not kept as a choice
    country: new FormControl(this.countries.some(country => country.code === this.address?.country) ? this.address!.country! : '',
      {nonNullable: true, validators: Validators.required}),
  });
  protected readonly savePromise = signal<Promise<void> | null>(null);

  protected save(): void {
    this.savePromise.set(this.store());
  }

  protected cancel(): void {
    this.dialogRef.close(false);
  }

  private async store(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const {street2, ...added} = this.form.getRawValue();
    const result = this.address
      ? await this.entities.updateAddress(this.data.entityId, {...added, street2, _id: this.address._id})
      // As the old dialog: a new address has no second street line
      : await this.entities.createAddress(this.data.entityId, added);
    if (!result?.success) {
      this.juicebox.showToast('error', this.i18n.transform('error'), result?.error);
      return;
    }
    this.dialogRef.close(true);
  }
}
