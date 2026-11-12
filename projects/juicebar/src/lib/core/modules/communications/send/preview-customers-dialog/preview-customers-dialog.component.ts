import {Component, inject, OnInit, signal} from '@angular/core';
import {DIALOG_DATA, DialogRef} from '@angular/cdk/dialog';
import {
  ButtonComponent,
  ColumnConfig,
  DataTableComponent,
  DialogActionsComponent,
  DialogContentComponent,
  DialogTitleComponent,
  PageEvent,
} from '../../../../../ui-components';
import {CommunicationsTranslationPipe} from '../../i18n/communications.translation';
import {RecipientDirectoryService} from '../../recipients/recipient-directory.service';
import {Customer} from '../../recipients/recipients.types';

export interface PreviewCustomersDialogData {
  /** The ids of the customers the quick send's recipient reaches */
  customerIds: string[];
}

const PAGE_SIZE = 10;

/** "Customers — Preview" (PREVIEW): the customers a quick send's recipient reaches, 10 to a page */
@Component({
  selector: 'app-preview-customers-dialog',
  templateUrl: './preview-customers-dialog.component.html',
  styleUrl: './preview-customers-dialog.component.scss',
  imports: [DialogTitleComponent, DialogContentComponent, DialogActionsComponent, DataTableComponent, ButtonComponent, CommunicationsTranslationPipe],
  providers: [CommunicationsTranslationPipe],
})
export class PreviewCustomersDialogComponent implements OnInit {
  private readonly directory = inject(RecipientDirectoryService);
  private readonly dialogRef = inject(DialogRef);
  private readonly i18n = inject(CommunicationsTranslationPipe);
  private readonly data = inject<PreviewCustomersDialogData>(DIALOG_DATA);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly pageSizeOptions: number[] = [];
  protected readonly columns: ColumnConfig[] = [
    {key: 'firstname', label: this.i18n.transform('firstname')},
    {key: 'lastname', label: this.i18n.transform('lastname')},
    {key: 'email', label: this.i18n.transform('email')},
  ];
  protected readonly rows = signal<Customer[]>([]);
  protected readonly count = signal(this.data.customerIds.length);
  protected readonly pageIndex = signal(0);
  /** Counts the page loads, so a slower older answer can't replace a newer one */
  private request = 0;

  async ngOnInit(): Promise<void> {
    await this.load(0);
  }

  protected onPage(event: PageEvent): void {
    void this.load(event.pageIndex);
  }

  protected close(): void {
    this.dialogRef.close();
  }

  private async load(pageIndex: number): Promise<void> {
    const request = ++this.request;
    this.pageIndex.set(pageIndex);
    const result = await this.directory.fetchCustomers(pageIndex, PAGE_SIZE, {fetch_in: {_id: this.data.customerIds}});
    if (request !== this.request || !result?.success || !result.payload) return;
    this.rows.set(result.payload.items ?? []);
    this.count.set(result.payload.count ?? 0);
  }
}
