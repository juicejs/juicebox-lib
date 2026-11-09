import {Component, inject, OnInit, signal} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {
  ButtonComponent,
  CellDefDirective,
  ColumnConfig,
  DataTableComponent,
  DialogService,
  IconComponent,
  TooltipDirective,
} from '../../../../../ui-components';
import {ConfirmationDialogComponent, ConfirmationDialogData} from '../../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import {escapeHtml, fileUrl} from '../../../../shared/components/media/media-files';
import {HasPermissionDirective} from '../../../../shared/directives/HasPermissionDirective';
import {AutoLanguagePipe} from '../../../../shared/pipes/auto-language.pipe';
import {Juice} from '../../../../shared/services/juice.service';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {LocationsTranslationPipe} from '../../i18n/locations.translation';
import {LocationsService} from '../../locations.service';
import {StoredLocation} from '../../locations.types';
import {AddRoomPlanComponent, AddRoomPlanData} from './add-room-plan/add-room-plan.component';
import {getRoomPlan} from './room-plans';

interface RoomPlanRow {
  _id: string;
  name: string;
  /** Its first image */
  preview: string | null;
}

/** A venue's room plans (its `attributes.roomPlans`): added from the room plans and removed again */
@Component({
  selector: 'app-seating-layout',
  templateUrl: './seating-layout.component.html',
  styleUrl: './seating-layout.component.scss',
  imports: [DataTableComponent, CellDefDirective, ButtonComponent, IconComponent, TooltipDirective, HasPermissionDirective, LocationsTranslationPipe],
  providers: [LocationsTranslationPipe],
})
export class SeatingLayoutComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly locations = inject(LocationsService);
  private readonly juice = inject(Juice);
  private readonly juicebox = inject(JuiceboxService);
  private readonly dialog = inject(DialogService);
  private readonly i18n = inject(LocationsTranslationPipe);
  private readonly autoLanguage = new AutoLanguagePipe(this.juicebox);
  private readonly endpoint = this.juicebox.getEndPoint();
  private readonly locationId = this.route.parent?.snapshot.paramMap.get('id') ?? null;

  private readonly location = signal<StoredLocation | null>(null);
  protected readonly rows = signal<RoomPlanRow[]>([]);
  protected readonly pageSize = signal(1);
  protected readonly pageSizeOptions: number[] = [];
  protected readonly columns: ColumnConfig[] = [
    {key: 'name', label: this.i18n.transform('name')},
    {key: 'preview', label: this.i18n.transform('image'), ellipsis: false},
    {key: 'actions', label: this.i18n.transform('actions'), width: '96px', align: 'right', ellipsis: false},
  ];

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected add(): void {
    const location = this.location();
    if (!location) return;
    this.dialog
      .open<AddRoomPlanComponent, AddRoomPlanData, boolean>(AddRoomPlanComponent, {
        data: {location},
        width: '560px',
        disableClose: true,
      })
      .closed.subscribe(added => {
        if (added) void this.load();
      });
  }

  protected remove(row: RoomPlanRow): void {
    const data: ConfirmationDialogData = {
      completeMessage: this.i18n.transform('remove_room_plan_question', {name: escapeHtml(row.name)}),
      confirm: 'remove',
      destructive: true,
    };
    this.dialog
      .open<ConfirmationDialogComponent, ConfirmationDialogData, boolean>(ConfirmationDialogComponent, {data})
      .closed.subscribe(async confirmed => {
        const location = this.location();
        if (!confirmed || !location) return;
        const roomPlans = (location.attributes?.roomPlans ?? []).filter(id => id !== row._id);
        const result = await this.locations.updateAttributes(location._id, {roomPlans});
        if (!result?.success) {
          this.juicebox.showToast('error', result?.error || this.i18n.transform('saving_failed'));
          return;
        }
        this.juicebox.showToast('success', this.i18n.transform('room_plan_removed'));
        await this.load();
      });
  }

  private async load(): Promise<void> {
    if (!this.locationId) return;
    const result = await this.locations.get(this.locationId);
    if (!result?.success || !result.payload) return;
    this.location.set(result.payload);
    const plans = await Promise.all((result.payload.attributes?.roomPlans ?? []).map(id => getRoomPlan(this.juice, id)));
    const rows = plans
      .filter(plan => plan?.success && plan.payload)
      .map(({payload}) => ({
        _id: payload!._id,
        name: this.autoLanguage.transform(payload!.name ?? ''),
        preview: fileUrl(payload!.media?.[0]?.fullPath, this.endpoint),
      }));
    this.rows.set(rows);
    this.pageSize.set(Math.max(1, rows.length));
  }
}
