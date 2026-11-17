import {DatePipe} from '@angular/common';
import {Component, inject, OnInit, signal} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {CellDefDirective, ColumnConfig, DataTableComponent, PageEvent, TooltipDirective} from '../../../../../ui-components';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {EntitiesService} from '../../entities.service';
import {PushNotification} from '../../entities.types';
import {EntitiesTranslationPipe} from '../../i18n/entities.translation';

/** The Push notifications tab: what the project's shop sent to the customer, in the admin's language, page by page */
@Component({
  selector: 'app-push-notifications',
  templateUrl: './push-notifications.component.html',
  imports: [DatePipe, DataTableComponent, CellDefDirective, TooltipDirective, EntitiesTranslationPipe],
  providers: [EntitiesTranslationPipe],
})
export class PushNotificationsComponent implements OnInit {
  private readonly entities = inject(EntitiesService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly i18n = inject(EntitiesTranslationPipe);
  private readonly entityId: string = inject(ActivatedRoute).snapshot.parent?.params['id'];

  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly pageSizeOptions = [10, 20, 30, 50];
  protected readonly count = signal(0);
  protected readonly rows = signal<PushNotification[]>([]);
  private request = 0;

  protected readonly columns: ColumnConfig[] = [
    {key: 'content.notification.title', label: this.i18n.transform('title')},
    {key: 'content.notification.body', label: this.i18n.transform('body')},
    {key: '_assets', label: this.i18n.transform('assets')},
    {key: '_offers', label: this.i18n.transform('offers')},
    {key: 'date', label: this.i18n.transform('sent'), width: '160px'},
  ];

  ngOnInit(): void {
    void this.fetch();
  }

  protected onPage(event: PageEvent): void {
    const sizeChanged = event.pageSize !== this.pageSize();
    this.pageSize.set(event.pageSize);
    this.page.set(sizeChanged ? 1 : event.pageIndex + 1);
    void this.fetch();
  }

  private async fetch(): Promise<void> {
    const request = ++this.request;
    const result = await this.entities.getPushNotifications(this.entityId, this.juicebox.getLanguage(), this.page() - 1, this.pageSize());
    if (request !== this.request || !result?.success) return;
    this.rows.set(result.payload?.items ?? []);
    this.count.set(result.payload?.count ?? 0);
  }
}
