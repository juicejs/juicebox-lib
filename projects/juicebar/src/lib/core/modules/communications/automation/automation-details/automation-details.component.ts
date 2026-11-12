import {Component, computed, inject, OnDestroy, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import {
  ButtonComponent,
  CardComponent,
  CardContentComponent,
  FormFieldComponent,
  InputDirective,
  LabelComponent,
  OptionComponent,
  SelectComponent,
} from '../../../../../ui-components';
import {PromiseButtonDirective} from '../../../../shared/directives/PromiseButton';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {CommunicationsService} from '../../communications.service';
import {Communication, CommunicationContent} from '../../communications.types';
import {CommunicationsTranslationPipe} from '../../i18n/communications.translation';
import {AutomationRecipientsComponent} from '../../recipients/automation-recipients/automation-recipients.component';

const DETAILS_URL = '/main/communications/automation/details';
/** The content choice lists the first 10 contents whose name contains what is typed (AUTODETAILS) */
const CONTENTS_SHOWN = 10;

/**
 * An opened automation (AutomationDetails): its name, event, channel and content on the left, its recipients on the
 * right. Save stores the name and the content with the rest as loaded, without a notice either way.
 */
@Component({
  selector: 'app-automation-details',
  templateUrl: './automation-details.component.html',
  styleUrl: './automation-details.component.scss',
  imports: [
    ReactiveFormsModule,
    CardComponent,
    CardContentComponent,
    FormFieldComponent,
    LabelComponent,
    InputDirective,
    SelectComponent,
    OptionComponent,
    ButtonComponent,
    PromiseButtonDirective,
    AutomationRecipientsComponent,
    CommunicationsTranslationPipe,
  ],
  providers: [CommunicationsTranslationPipe],
})
export class AutomationDetailsComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly communications = inject(CommunicationsService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly i18n = inject(CommunicationsTranslationPipe);

  /** The automation shown; its recipients are created anew for another one */
  protected readonly automationId = signal<string | null>(null);
  private readonly communication = signal<Communication | null>(null);
  protected readonly loaded = computed(() => !!this.communication());
  protected readonly event = computed(() => this.communication()?.event ?? '');
  protected readonly channel = computed(() => this.communication()?.channel ?? '');
  protected readonly contents = signal<CommunicationContent[]>([]);
  protected readonly savePromise = signal<Promise<void> | null>(null);
  protected readonly form = new FormGroup({
    name: new FormControl('', {nonNullable: true}),
    content: new FormControl<string | null>(null),
  });
  private contentSearch = 0;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const id = params.get('id');
      this.automationId.set(id);
      if (id) void this.load(id);
    });
  }

  ngOnDestroy(): void {
    this.juicebox.setPageHeader(null);
  }

  protected onContentSearch(term: string): void {
    void this.searchContents(term);
  }

  protected save(): void {
    this.savePromise.set(this.update());
  }

  private async load(id: string): Promise<void> {
    this.communication.set(null);
    this.contents.set([]);
    const communication = await this.communications.getCommunication(id);
    if (!communication || this.automationId() !== id) return;
    this.form.reset({name: communication.name ?? '', content: communication.content ?? null});
    this.communication.set(communication);
    this.showHeader(id, communication.name ?? '');
    await this.searchContents('');
  }

  /** The organisation's contents of the module whose name contains the term, with the chosen one added */
  private async searchContents(term: string): Promise<void> {
    const search = ++this.contentSearch;
    const result = await this.communications.searchContents([{property: 'name', term, fullText: true}], 0, CONTENTS_SHOWN, {});
    const contents = [...(result?.contents ?? [])];
    const chosen = this.form.controls.content.value;
    if (chosen && !contents.some(content => content._id === chosen)) {
      const content = await this.communications.getContent(chosen);
      if (content) contents.push(content);
    }
    if (search === this.contentSearch) this.contents.set(contents);
  }

  private async update(): Promise<void> {
    const communication = this.communication();
    if (!communication) return;
    const {name, content: chosen} = this.form.getRawValue();
    // As the old page sent it: a content cleared by hand goes as null, one never set stays as it was loaded
    const content = chosen ?? (this.form.controls.content.dirty ? null : communication.content);
    const result = await this.communications.updateCommunication(communication._id, {...communication, name, content});
    if (!result?.success || this.automationId() !== communication._id) return;
    this.communication.set({...communication, name, content});
    this.form.markAsPristine();
    this.showHeader(communication._id, name);
  }

  private showHeader(id: string, name: string): void {
    this.juicebox.setPageHeader({scope: `${DETAILS_URL}/${id}`, title: name});
    this.juicebox.navigationEvent({location: this.i18n.transform('communication'), subject: name, link: '/main/communications'});
  }
}
