import {DatePipe} from '@angular/common';
import {Component, inject, OnInit, signal} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {
  ButtonComponent,
  CellDefDirective,
  ColumnConfig,
  DataTableComponent,
  DialogService,
  FormFieldComponent,
  IconComponent,
  LabelComponent,
  OptionComponent,
  PageEvent,
  ProgressSpinnerComponent,
  SelectComponent,
  TooltipDirective,
} from '../../../../../ui-components';
import {EntitiesService} from '../../entities.service';
import {MailingHistoryItem, MailingProvider} from '../../entities.types';
import {EntitiesTranslationPipe} from '../../i18n/entities.translation';
import {EmailPreviewDialogComponent} from './email-preview-dialog.component';

const PAGE_SIZE = 10;

/**
 * The Communication tab: the e-mails a mailing provider recorded for the customer, 10 to a page, with whether they
 * were opened and clicked, and the e-mail's text where the provider kept it. The first provider is chosen at first;
 * one that keeps no history cannot be chosen.
 */
@Component({
  selector: 'app-mailing-history',
  templateUrl: './mailing-history.component.html',
  styleUrl: './mailing-history.component.scss',
  imports: [
    DatePipe,
    DataTableComponent,
    CellDefDirective,
    FormFieldComponent,
    LabelComponent,
    SelectComponent,
    OptionComponent,
    ButtonComponent,
    IconComponent,
    TooltipDirective,
    ProgressSpinnerComponent,
    EntitiesTranslationPipe,
  ],
  providers: [EntitiesTranslationPipe],
})
export class MailingHistoryComponent implements OnInit {
  private readonly entities = inject(EntitiesService);
  private readonly dialog = inject(DialogService);
  private readonly i18n = inject(EntitiesTranslationPipe);
  private readonly entityId: string = inject(ActivatedRoute).snapshot.parent?.params['id'];

  protected readonly pageSize = PAGE_SIZE;
  protected readonly pageSizeOptions = [PAGE_SIZE];
  protected readonly providers = signal<MailingProvider[]>([]);
  protected readonly provider = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly page = signal(1);
  protected readonly count = signal(0);
  protected readonly rows = signal<MailingHistoryItem[]>([]);
  private request = 0;

  protected readonly columns: ColumnConfig[] = [
    {key: 'subject', label: this.i18n.transform('name')},
    {key: 'last_event_time', label: this.i18n.transform('timestamp'), width: '150px'},
    {key: 'status', label: this.i18n.transform('status'), width: '120px'},
    {key: 'opens_count', label: this.i18n.transform('opens_count'), width: '120px'},
    {key: 'clicks_count', label: this.i18n.transform('clicks_count'), width: '120px'},
    {key: 'actions', label: this.i18n.transform('email_preview'), width: '80px', align: 'right', ellipsis: false},
  ];

  async ngOnInit(): Promise<void> {
    const result = await this.entities.getMailingProviders();
    if (result?.success) {
      const providers = result.payload ?? [];
      this.providers.set(providers);
      if (providers.length) this.provider.set(providers[0].key);
    }
    await this.fetchHistory();
  }

  protected selectProvider(provider: string): void {
    this.provider.set(provider);
    void this.fetchHistory();
  }

  protected onPage(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    void this.fetchHistory();
  }

  protected showContent(row: MailingHistoryItem): void {
    this.dialog.open<EmailPreviewDialogComponent, string>(EmailPreviewDialogComponent, {data: row.template ?? '', width: '800px'});
  }

  private async fetchHistory(): Promise<void> {
    const request = ++this.request;
    this.loading.set(true);
    const result = await this.entities.fetchMailingHistory(this.provider(), this.entityId, this.page() - 1, PAGE_SIZE).catch(() => null);
    if (request !== this.request) return;
    this.rows.set(result?.payload?.items ?? []);
    this.count.set(result?.payload?.count ?? 0);
    this.loading.set(false);
  }
}
