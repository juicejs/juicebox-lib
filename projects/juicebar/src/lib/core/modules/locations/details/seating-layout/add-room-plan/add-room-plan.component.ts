import {Component, computed, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {DIALOG_DATA, DialogRef} from '@angular/cdk/dialog';
import {
  ButtonComponent,
  DialogActionsComponent,
  DialogContentComponent,
  DialogTitleComponent,
  FormFieldComponent,
  LabelComponent,
  OptionComponent,
  SelectComponent,
} from '../../../../../../ui-components';
import {PromiseButtonDirective} from '../../../../../shared/directives/PromiseButton';
import {AutoLanguagePipe} from '../../../../../shared/pipes/auto-language.pipe';
import {Juice} from '../../../../../shared/services/juice.service';
import {JuiceboxService} from '../../../../../shared/services/Juicebox.service';
import {LocationsTranslationPipe} from '../../../i18n/locations.translation';
import {LocationsService} from '../../../locations.service';
import {StoredLocation} from '../../../locations.types';
import {RoomPlan, searchRoomPlans} from '../room-plans';

export interface AddRoomPlanData {
  location: StoredLocation;
}

/** The search waits for typing to pause */
const SEARCH_DELAY_MS = 300;

/** Picks room plans by a name search and adds them to the venue; the ones it has already can't be picked */
@Component({
  selector: 'app-add-room-plan',
  templateUrl: './add-room-plan.component.html',
  imports: [
    ReactiveFormsModule,
    DialogTitleComponent,
    DialogContentComponent,
    DialogActionsComponent,
    FormFieldComponent,
    LabelComponent,
    SelectComponent,
    OptionComponent,
    ButtonComponent,
    PromiseButtonDirective,
    AutoLanguagePipe,
    LocationsTranslationPipe,
  ],
  providers: [LocationsTranslationPipe],
})
export class AddRoomPlanComponent implements OnInit, OnDestroy {
  private readonly juice = inject(Juice);
  private readonly juicebox = inject(JuiceboxService);
  private readonly locations = inject(LocationsService);
  private readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);
  private readonly i18n = inject(LocationsTranslationPipe);
  private readonly location = inject<AddRoomPlanData>(DIALOG_DATA).location;
  private readonly language = this.juicebox.getLanguage();
  private searchTimer?: ReturnType<typeof setTimeout>;
  private request = 0;

  /** The venue's room plans */
  private readonly linked = new Set(this.location.attributes?.roomPlans ?? []);
  private readonly results = signal<RoomPlan[]>([]);
  protected readonly options = computed(() =>
    this.results().map(plan => ({_id: plan._id, name: plan.name ?? '', linked: this.linked.has(plan._id)})));
  protected readonly picked = new FormControl<string[]>([], {nonNullable: true});
  private readonly pickedIds = toSignal(this.picked.valueChanges, {initialValue: this.picked.value});
  protected readonly nothingPicked = computed(() => !this.pickedIds().length);
  protected readonly addPromise = signal<Promise<void>>(Promise.resolve());

  ngOnInit(): void {
    void this.search('');
  }

  ngOnDestroy(): void {
    clearTimeout(this.searchTimer);
  }

  protected onSearch(term: string): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.search(term), SEARCH_DELAY_MS);
  }

  protected add(): void {
    this.addPromise.set(this.store());
  }

  protected close(): void {
    this.dialogRef.close(false);
  }

  private async search(term: string): Promise<void> {
    const request = ++this.request;
    const result = await searchRoomPlans(this.juice, term, this.language);
    if (request !== this.request || !result?.success) return;
    this.results.set(result.payload?.roomPlans ?? []);
  }

  private async store(): Promise<void> {
    const roomPlans = [...this.linked, ...this.picked.value.filter(id => !this.linked.has(id))];
    const result = await this.locations.updateAttributes(this.location._id, {roomPlans});
    if (!result?.success) {
      this.juicebox.showToast('error', result?.error || this.i18n.transform('saving_failed'));
      return;
    }
    this.juicebox.showToast('success', this.i18n.transform('room_plans_added'));
    this.dialogRef.close(true);
  }
}
