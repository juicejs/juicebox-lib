import {Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {Location} from '@angular/common';
import {Router, RouterLink} from '@angular/router';
import {
  ButtonComponent,
  CellDefDirective,
  ColumnConfig,
  CompactRowDefDirective,
  DataTableComponent,
  DialogService,
  FormFieldComponent,
  HeaderDefDirective,
  IconComponent,
  LabelComponent,
  OptionComponent,
  PageEvent,
  SelectComponent,
  TooltipDirective,
} from '../../../../../ui-components';
import {injectListingPane, ListingStateService} from '../../../../shared/components/listing-pane/listing-pane';
import {ConfigurationService} from '../../../../shared/services/configuration.service';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {CommunicationsService} from '../../communications.service';
import {CommunicationContent, CommunicationListOptions, CommunicationSearchTerm} from '../../communications.types';
import {CommunicationsTranslationPipe} from '../../i18n/communications.translation';
import {ContentCreateDialogComponent, ContentCreateDialogData} from '../content-create/content-create-dialog.component';
import {CONTENT_UPDATE_PERMISSION, contentLink, hasContentTags} from '../contents-shared';

/** What the listing shows, kept for the compact list next to an open content */
interface ContentsListingState {
  page: number;
  pageSize: number;
  search: {terms: CommunicationSearchTerm[]} | null;
}

const LISTING_STATE_KEY = 'communications-contents';
/** The name and tag filters wait half a second after typing pauses */
const FILTER_DELAY_MS = 500;
/** The module's contents: their type begins with `communications` */
const CONTENT_TYPE_FILTER: CommunicationListOptions['filter'] = {type: {fullText: false, term: '^communications'}};

/**
 * The Contents tab (ContentList): the contents page by page in the order the backend keeps them, filtered by name in
 * the table's header or, for AMG (`amgshop`), by tag; each filter replaces the other. A click opens a content for
 * staff with `updated`, in a new browser tab with Ctrl; the bin deletes it at once. Next to an open content (the split
 * view) it is the compact list of the rows it showed last.
 */
@Component({
  selector: 'app-content-list',
  templateUrl: './content-list.component.html',
  styleUrl: './content-list.component.scss',
  imports: [
    RouterLink,
    DataTableComponent,
    CellDefDirective,
    CompactRowDefDirective,
    HeaderDefDirective,
    ButtonComponent,
    IconComponent,
    TooltipDirective,
    FormFieldComponent,
    LabelComponent,
    SelectComponent,
    OptionComponent,
    CommunicationsTranslationPipe,
  ],
  providers: [CommunicationsTranslationPipe],
  host: {
    '(click)': 'openClicked($event)',
  },
})
export class ContentListComponent implements OnInit, OnDestroy {
  /** Set when this is the compact list next to an open content, not the page itself */
  protected readonly pane = injectListingPane();
  private readonly listingState = inject(ListingStateService);
  private readonly communications = inject(CommunicationsService);
  private readonly configuration = inject(ConfigurationService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly dialog = inject(DialogService);
  private readonly router = inject(Router);
  private readonly addressBar = inject(Location);
  private readonly i18n = inject(CommunicationsTranslationPipe);

  protected readonly canOpen = !!this.juicebox.hasPermission(CONTENT_UPDATE_PERMISSION);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly pageSizeOptions = [10, 20, 30, 50];
  protected readonly count = signal(0);
  protected readonly rows = signal<CommunicationContent[]>([]);
  protected readonly tagsEnabled = signal(false);
  protected readonly tags = signal<string[]>([]);
  /** The name or tag searched for; none until a filter was used */
  private search: {terms: CommunicationSearchTerm[]} | null = null;
  private filterTimer?: ReturnType<typeof setTimeout>;
  private request = 0;
  /** The row a click landed on, opened once the click reaches the host and tells whether Ctrl was held */
  private clickedRow: CommunicationContent | null = null;

  private readonly allColumns: ColumnConfig[] = [
    {key: 'name', label: this.i18n.transform('name')},
    {key: 'subject', label: this.i18n.transform('subject')},
    {key: 'tag', label: this.i18n.transform('tags')},
    {key: 'actions', label: this.i18n.transform('actions'), width: '96px', align: 'right', ellipsis: false},
  ];
  /** The Tags column only for AMG */
  protected readonly columns = computed(() => {
    const tagsEnabled = this.tagsEnabled();
    return this.allColumns.filter(column => tagsEnabled || column.key !== 'tag');
  });

  async ngOnInit(): Promise<void> {
    if (this.pane) {
      const state = this.listingState.restore<ContentsListingState>(LISTING_STATE_KEY);
      if (state) {
        this.page.set(state.page);
        this.pageSize.set(state.pageSize);
        this.search = state.search;
      }
      await this.fetch();
      return;
    }

    this.juicebox.navigationEvent({
      location: this.i18n.transform('communications'),
      subject: this.i18n.transform('contents'),
      link: '/main/communications/contents',
    });
    this.juicebox.setActionButtons([{
      title: this.i18n.transform('create_content'),
      type: 'btn-primary',
      icon: 'add',
      callback: () => this.create(),
    }]);

    const tagsEnabled = await hasContentTags(this.configuration);
    this.tagsEnabled.set(tagsEnabled);
    if (tagsEnabled) void this.loadTags();
    await this.fetch();
  }

  ngOnDestroy(): void {
    clearTimeout(this.filterTimer);
  }

  /** The name filter and the tag filter each replace the other; a value starts again from the first page */
  protected onFilter(property: 'name' | 'tag', value: string | null): void {
    clearTimeout(this.filterTimer);
    if (value) {
      this.search = {terms: [{property, fullText: true, language: false, term: value}]};
      this.page.set(1);
    } else {
      this.search = {terms: []};
    }
    this.filterTimer = setTimeout(() => void this.fetch(), FILTER_DELAY_MS);
  }

  protected onPage(event: PageEvent): void {
    const sizeChanged = event.pageSize !== this.pageSize();
    this.pageSize.set(event.pageSize);
    this.page.set(sizeChanged ? 1 : event.pageIndex + 1);
    void this.fetch();
  }

  protected rowClicked(row: CommunicationContent): void {
    this.clickedRow = row;
  }

  /** The click that reached a row bubbles up to here, where Ctrl can be read */
  protected openClicked(event: MouseEvent): void {
    const row = this.clickedRow;
    this.clickedRow = null;
    if (row) this.open(row, event.ctrlKey || event.metaKey);
  }

  /** At once, without asking; automations using the content keep pointing at it */
  protected async remove(row: CommunicationContent): Promise<void> {
    await this.communications.deleteContent(row._id);
    await this.fetch();
  }

  private open(row: CommunicationContent, newTab: boolean): void {
    if (!this.canOpen) return;
    const url = this.router.serializeUrl(this.router.createUrlTree(contentLink(row._id)));
    if (newTab) window.open(this.addressBar.prepareExternalUrl(url), '_blank');
    else void this.router.navigateByUrl(url);
  }

  private create(): void {
    this.dialog
      .open<ContentCreateDialogComponent, ContentCreateDialogData, boolean>(ContentCreateDialogComponent, {
        data: {tags: this.tagsEnabled()},
        disableClose: true,
      })
      .closed.subscribe(created => {
        if (created) void this.fetch();
      });
  }

  private async loadTags(): Promise<void> {
    const result = await this.communications.getContentTags();
    const tags = result?.success ? (result.payload ?? []).map(entry => entry.tag) : [];
    this.tags.set(tags.filter((tag): tag is string => typeof tag === 'string' && tag !== ''));
  }

  private async fetch(): Promise<void> {
    const request = ++this.request;
    this.listingState.save(LISTING_STATE_KEY, {
      page: this.page(),
      pageSize: this.pageSize(),
      search: this.search,
    } satisfies ContentsListingState);
    const options: CommunicationListOptions = {
      filter: CONTENT_TYPE_FILTER,
      ...(this.search && {search: this.search}),
    };
    const result = await this.communications.fetchContents(this.page() - 1, this.pageSize(), options);
    if (request !== this.request || !result || !('contents' in result)) return;
    this.rows.set(result.contents ?? []);
    this.count.set(result.count ?? 0);
  }
}
