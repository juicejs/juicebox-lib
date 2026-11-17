import {Component, inject, OnInit, signal} from '@angular/core';
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
} from '../../../../../../ui-components';
import {PromiseButtonDirective} from '../../../../../shared/directives/PromiseButton';
import {JuiceboxService} from '../../../../../shared/services/Juicebox.service';
import {EntitiesService} from '../../../entities.service';
import {WalletPublisher} from '../../../entities.types';
import {EntitiesTranslationPipe} from '../../../i18n/entities.translation';

/**
 * Creates a wallet for a customer on the project's ledger, under an asset publisher: the publisher of the staff
 * member's organisation is chosen at first. An empty address lets the ledger generate one. As in the old dialog
 * "Add" does not wait for the required fields.
 */
@Component({
  selector: 'app-add-wallet-dialog',
  templateUrl: './add-wallet-dialog.component.html',
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
export class AddWalletDialogComponent implements OnInit {
  private readonly entities = inject(EntitiesService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);
  private readonly entityId = inject<string>(DIALOG_DATA);

  protected readonly publishers = signal<WalletPublisher[]>([]);
  protected readonly form = new FormGroup({
    publisher: new FormControl<string | null>(null, Validators.required),
    name: new FormControl('', {nonNullable: true, validators: Validators.required}),
    address: new FormControl('', {nonNullable: true}),
  });
  protected readonly createPromise = signal<Promise<void> | null>(null);

  async ngOnInit(): Promise<void> {
    const result = await this.entities.fetchPublishers(0, 100, {});
    const publishers = result?.payload?.publishers ?? [];
    this.publishers.set(publishers);
    if (!publishers.length) return;
    const organisation = await this.juicebox.getLoggedInOrganisation();
    const own = publishers.find(publisher => publisher.organisation_id === organisation?._id);
    if (own) this.form.controls.publisher.setValue(own.id);
  }

  protected create(): void {
    this.createPromise.set(this.save());
  }

  protected cancel(): void {
    this.dialogRef.close(false);
  }

  private async save(): Promise<void> {
    const {publisher, name, address} = this.form.getRawValue();
    const result = await this.entities.createWallet(this.entityId, {address, name, publisherId: publisher ?? undefined, transferLock: 2});
    if (result) this.dialogRef.close(true);
  }
}
