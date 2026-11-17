import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {
  ButtonComponent,
  CellDefDirective,
  ColumnConfig,
  DataTableComponent,
  DialogService,
  IconComponent,
  PageEvent,
  TooltipDirective,
} from '../../../../../ui-components';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {EntitiesService} from '../../entities.service';
import {EntityWallet} from '../../entities.types';
import {EntitiesTranslationPipe} from '../../i18n/entities.translation';
import {AddWalletDialogComponent} from './add-wallet/add-wallet-dialog.component';

const PAGE_SIZE = 10;

/**
 * The Wallets tab: the customer's wallets on the project's ledger, 10 to a page, with a wallet address kept in the
 * customer's attributes listed among them. As in the old tab a wallet is deleted without a question.
 */
@Component({
  selector: 'app-wallet-entity',
  templateUrl: './wallet-entity.component.html',
  imports: [DataTableComponent, CellDefDirective, ButtonComponent, IconComponent, TooltipDirective, EntitiesTranslationPipe],
  providers: [EntitiesTranslationPipe],
})
export class WalletEntityComponent implements OnInit {
  private readonly entities = inject(EntitiesService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly dialog = inject(DialogService);
  private readonly i18n = inject(EntitiesTranslationPipe);
  private readonly entityId: string = inject(ActivatedRoute).snapshot.parent?.params['id'];

  protected readonly pageSize = PAGE_SIZE;
  protected readonly pageSizeOptions = [PAGE_SIZE];
  protected readonly page = signal(1);
  private readonly wallets = signal<EntityWallet[]>([]);
  protected readonly count = computed(() => this.wallets().length);
  protected readonly rows = computed(() => this.wallets().slice((this.page() - 1) * PAGE_SIZE, this.page() * PAGE_SIZE));

  protected readonly columns: ColumnConfig[] = [
    {key: 'name', label: this.i18n.transform('name')},
    {key: 'address', label: this.i18n.transform('wallet_address')},
    {key: 'actions', label: this.i18n.transform('actions'), width: '80px', align: 'right', ellipsis: false},
  ];

  ngOnInit(): void {
    this.juicebox.setActionButtons([{
      title: this.i18n.transform('add_wallet'),
      icon: 'add_circle',
      type: 'btn-primary',
      permissionsHide: 'entities:role#update',
      callback: () => this.add(),
    }]);
    void this.load();
  }

  protected onPage(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
  }

  protected async remove(wallet: EntityWallet): Promise<void> {
    await this.entities.deleteWallet(this.entityId, wallet);
    await this.load();
  }

  /** The list is read again when the dialog closes, however it was closed */
  private add(): void {
    this.dialog
      .open<AddWalletDialogComponent, string, boolean>(AddWalletDialogComponent, {data: this.entityId, disableClose: true})
      .closed.subscribe(() => void this.load());
  }

  private async load(): Promise<void> {
    const result = await this.entities.get(this.entityId);
    if (!result?.success || !result.payload) return;
    const own = result.payload.attributes?.['wallet'];
    this.wallets.set([
      ...(result.payload.wallets ?? []),
      ...(typeof own === 'string' && own ? [{address: own}] : []),
    ]);
    const lastPage = Math.max(Math.ceil(this.count() / PAGE_SIZE), 1);
    if (this.page() > lastPage) this.page.set(lastPage);
  }
}
