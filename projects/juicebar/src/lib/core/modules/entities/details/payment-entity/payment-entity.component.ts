import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {toSignal} from '@angular/core/rxjs-interop';
import {ActivatedRoute} from '@angular/router';
import {
  ButtonComponent,
  CardComponent,
  DialogService,
  FormFieldComponent,
  InputDirective,
  LabelComponent,
  ProgressSpinnerComponent,
} from '../../../../../ui-components';
import {ConfirmationDialogComponent, ConfirmationDialogData} from '../../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import {PromiseButtonDirective} from '../../../../shared/directives/PromiseButton';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {EntitiesService} from '../../entities.service';
import {Entity} from '../../entities.types';
import {EntitiesTranslationPipe} from '../../i18n/entities.translation';

type AccountState = 'checking' | 'none' | 'unfinished' | 'connected';

/**
 * The Payment tab of an organisation: whether its account with the payment provider (Stripe) is connected, unlinking
 * it (super admins of customers), and the organisation's platform fee and fee per article, kept in its attributes.
 */
@Component({
  selector: 'app-payment-entity',
  templateUrl: './payment-entity.component.html',
  styleUrl: './payment-entity.component.scss',
  imports: [
    ReactiveFormsModule,
    CardComponent,
    FormFieldComponent,
    LabelComponent,
    InputDirective,
    ButtonComponent,
    ProgressSpinnerComponent,
    PromiseButtonDirective,
    EntitiesTranslationPipe,
  ],
  providers: [EntitiesTranslationPipe],
})
export class PaymentEntityComponent implements OnInit {
  private readonly entities = inject(EntitiesService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly dialog = inject(DialogService);
  private readonly i18n = inject(EntitiesTranslationPipe);
  private readonly organisationId: string = inject(ActivatedRoute).snapshot.parent?.params['id'];

  protected readonly canUnlink = !!this.juicebox.hasPermission('entities:role#super-admin');
  private readonly organisation = signal<Entity | null>(null);
  protected readonly loaded = computed(() => !!this.organisation());
  protected readonly state = signal<AccountState>('checking');
  protected readonly hasAccount = computed(() => !!this.organisation()?.attributes?.['account_id']);
  protected readonly fees = new FormGroup({
    fee: new FormControl<number | null>(null),
    article_fee: new FormControl<number | null>(null),
  });
  private readonly feeValues = toSignal(this.fees.valueChanges, {initialValue: this.fees.getRawValue()});
  /** As the old tab: the platform fee from 0 to 10, the article fee not under 0 */
  protected readonly invalidFee = computed(() => {
    const {fee, article_fee} = this.feeValues();
    return (fee ?? 0) < 0 || (fee ?? 0) > 10 || (article_fee ?? 0) < 0;
  });
  protected readonly updatePromise = signal<Promise<void> | null>(null);

  ngOnInit(): Promise<void> {
    return this.load(true);
  }

  protected unlinkAccount(): void {
    const data: ConfirmationDialogData = {
      completeMessage: this.i18n.transform('are_you_sure_you_want_to_unlink_account'),
      subject: this.organisation()?.name,
    };
    this.dialog
      .open<ConfirmationDialogComponent, ConfirmationDialogData, boolean>(ConfirmationDialogComponent, {data})
      .closed.subscribe(async confirmed => {
        if (!confirmed) return;
        const result = await this.entities.unlinkStripeAccount(this.organisationId);
        if (result?.success) await this.load(false);
      });
  }

  protected update(): void {
    this.updatePromise.set(this.save());
  }

  /** Reads the organisation and asks the payment provider about its account; `withFees` also fills the fee fields */
  private async load(withFees: boolean): Promise<void> {
    this.state.set('checking');
    const result = await this.entities.get(this.organisationId);
    const organisation = result?.payload;
    if (!organisation) return;
    this.organisation.set(organisation);
    const attributes = organisation.attributes ?? {};
    if (withFees) this.fees.reset({fee: numberOrNull(attributes['fee']), article_fee: numberOrNull(attributes['article_fee'])});
    if (!attributes['account_id']) {
      this.state.set('none');
      return;
    }
    const submitted = await this.entities.checkDetailsSubmitted(this.organisationId);
    this.state.set(submitted?.payload?.detailsSubmitted ? 'connected' : 'unfinished');
  }

  private async save(): Promise<void> {
    const organisation = this.organisation();
    if (!organisation) return;
    // As the old tab sent them: all the organisation's attributes, a fee that was changed as its field stands and one
    // that was not as it is stored
    const attributes: Record<string, unknown> = {...(organisation.attributes ?? {})};
    for (const key of ['fee', 'article_fee'] as const) {
      const control = this.fees.controls[key];
      if (control.dirty) attributes[key] = control.value;
    }
    const result = await this.entities.updateAttributes(organisation._id, attributes);
    if (!result?.success) {
      this.juicebox.showToast('error', this.i18n.transform('error'), result?.error);
      return;
    }
    this.juicebox.showToast('success', this.i18n.transform('success'));
    this.organisation.set({...organisation, attributes});
    this.fees.markAsPristine();
  }
}

/** A stored fee as its field shows it; one stored as a text that is a number shows too */
function numberOrNull(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}
