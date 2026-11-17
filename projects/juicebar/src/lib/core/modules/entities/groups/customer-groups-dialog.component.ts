import {Component, inject, OnInit, signal} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {DialogRef} from '@angular/cdk/dialog';
import {
  ButtonComponent,
  CellDefDirective,
  ColumnConfig,
  DataTableComponent,
  DialogActionsComponent,
  DialogContentComponent,
  DialogService,
  DialogTitleComponent,
  FormFieldComponent,
  IconComponent,
  InputDirective,
  LabelComponent,
  PageEvent,
  TooltipDirective,
} from '../../../../ui-components';
import {PromiseButtonDirective} from '../../../shared/directives/PromiseButton';
import {JuiceboxService} from '../../../shared/services/Juicebox.service';
import {EntitiesService} from '../entities.service';
import {EntityGroup} from '../entities.types';
import {EntitiesTranslationPipe} from '../i18n/entities.translation';
import {RenameGroupDialogComponent} from './rename-group-dialog.component';

const PAGE_SIZE = 10;

/**
 * The customer groups of the organisation: a field that adds one, and the list, 10 to a page, with delete and edit
 * on each. As in the old dialog a group is deleted without a question; the backend keeps one that still has customers.
 */
@Component({
  selector: 'app-customer-groups-dialog',
  templateUrl: './customer-groups-dialog.component.html',
  styleUrl: './customer-groups-dialog.component.scss',
  imports: [
    ReactiveFormsModule,
    DialogTitleComponent,
    DialogContentComponent,
    DialogActionsComponent,
    DataTableComponent,
    CellDefDirective,
    FormFieldComponent,
    LabelComponent,
    InputDirective,
    ButtonComponent,
    IconComponent,
    TooltipDirective,
    PromiseButtonDirective,
    EntitiesTranslationPipe,
  ],
  providers: [EntitiesTranslationPipe],
})
export class CustomerGroupsDialogComponent implements OnInit {
  private readonly entities = inject(EntitiesService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly dialog = inject(DialogService);
  private readonly dialogRef = inject<DialogRef<void>>(DialogRef);
  private readonly i18n = inject(EntitiesTranslationPipe);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly pageSizeOptions = [PAGE_SIZE];
  protected readonly groupName = new FormControl('', {nonNullable: true});
  protected readonly page = signal(1);
  protected readonly count = signal(0);
  protected readonly rows = signal<EntityGroup[]>([]);
  protected readonly createPromise = signal<Promise<void> | null>(null);
  private creating = false;
  private request = 0;

  protected readonly columns: ColumnConfig[] = [
    {key: 'name', label: this.i18n.transform('name')},
    {key: 'actions', label: this.i18n.transform('actions'), width: '112px', align: 'right', ellipsis: false},
  ];

  ngOnInit(): void {
    void this.load();
  }

  protected onPage(event: PageEvent): void {
    this.page.set(event.pageIndex + 1);
    void this.load();
  }

  protected create(): void {
    // One at a time: a second Enter or click while the group is being added adds nothing
    if (this.creating) return;
    this.creating = true;
    this.createPromise.set(this.add().finally(() => this.creating = false));
  }

  /** Enter in the field creates, as in the old dialog; not while a text is still being composed, nor when Enter is held */
  protected onEnter(event: Event): void {
    const key = event as KeyboardEvent;
    if (key.isComposing || key.repeat) return;
    this.create();
  }

  protected edit(group: EntityGroup): void {
    this.dialog
      .open<RenameGroupDialogComponent, EntityGroup, boolean>(RenameGroupDialogComponent, {data: group})
      .closed.subscribe(saved => {
        if (saved) void this.load();
      });
  }

  protected async remove(group: EntityGroup): Promise<void> {
    const result = await this.entities.deleteGroup(group._id);
    if (!result?.success) this.showError(result?.error);
    this.page.set(1);
    await this.load();
  }

  protected close(): void {
    this.dialogRef.close();
  }

  private async add(): Promise<void> {
    const name = this.groupName.value;
    if (!name) {
      this.juicebox.showToast('error', this.i18n.transform('group_name_required'));
      return;
    }
    const result = await this.entities.createNewEntityGroup(name);
    if (!result?.success) this.showError(result?.error);
    this.groupName.reset('');
    this.page.set(1);
    await this.load();
  }

  private async load(): Promise<void> {
    const request = ++this.request;
    const result = await this.entities.fetchEntityGroups(this.page() - 1, PAGE_SIZE, {});
    if (request !== this.request || !result?.success) return;
    this.rows.set(result.payload?.items ?? []);
    this.count.set(result.payload?.count ?? 0);
  }

  /** The backend's reason, e.g. "non empty group" */
  private showError(reason: string | undefined): void {
    this.juicebox.showToast('error', this.i18n.transform('error'), reason);
  }
}
