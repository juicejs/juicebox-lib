import {Component, inject, OnDestroy, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import {
  ButtonComponent,
  CardActionsComponent,
  CardComponent,
  CardContentComponent,
  FormFieldComponent,
  InputDirective,
  LabelComponent,
  RichTextEditorComponent,
} from '../../../../../ui-components';
import {PromiseButtonDirective} from '../../../../shared/directives/PromiseButton';
import {ConfigurationService} from '../../../../shared/services/configuration.service';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {CommunicationsService} from '../../communications.service';
import {CommunicationContent} from '../../communications.types';
import {CommunicationsTranslationPipe} from '../../i18n/communications.translation';
import {hasContentTags} from '../contents-shared';
import {ContentPlaceholdersComponent} from './content-placeholders/content-placeholders.component';

/**
 * A content's page (ContentPage): its name, subject, AMG's tag and its text in the rich-text editor, with the
 * placeholder reference beside the text. Save stores the fields as they are, empty ones too. The form tells the
 * unsaved-changes guard whether there is anything to lose.
 */
@Component({
  selector: 'app-content-edit',
  templateUrl: './content-edit.component.html',
  styleUrl: './content-edit.component.scss',
  imports: [
    ReactiveFormsModule,
    CardComponent,
    CardContentComponent,
    CardActionsComponent,
    FormFieldComponent,
    LabelComponent,
    InputDirective,
    RichTextEditorComponent,
    ButtonComponent,
    PromiseButtonDirective,
    ContentPlaceholdersComponent,
    CommunicationsTranslationPipe,
  ],
  providers: [CommunicationsTranslationPipe],
})
export class ContentEditComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly communications = inject(CommunicationsService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly i18n = inject(CommunicationsTranslationPipe);
  private readonly tagsLoad = hasContentTags(inject(ConfigurationService));

  protected readonly form = new FormGroup({
    name: new FormControl('', {nonNullable: true}),
    subject: new FormControl('', {nonNullable: true}),
    template: new FormControl('', {nonNullable: true}),
    tag: new FormControl('', {nonNullable: true}),
  });
  protected readonly tagsEnabled = signal(false);
  /** Set once the content shown was read */
  protected readonly loaded = signal(false);
  protected readonly savePromise = signal<Promise<void>>(Promise.resolve());
  private readonly contentId = signal<string | null>(null);
  private readonly content = signal<CommunicationContent | null>(null);

  constructor() {
    // Another content opened from the list next to it reuses this page
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(params => {
      const id = params.get('id');
      this.contentId.set(id);
      if (id) void this.load(id);
    });
  }

  ngOnDestroy(): void {
    this.juicebox.setPageHeader(null);
  }

  protected save(): void {
    this.savePromise.set(this.update());
  }

  private async load(id: string): Promise<void> {
    this.loaded.set(false);
    this.content.set(null);
    const [tagsEnabled, content] = await Promise.all([this.tagsLoad, this.communications.getContent(id)]);
    if (this.contentId() !== id) return;
    this.tagsEnabled.set(tagsEnabled);
    this.content.set(content || null);
    this.form.reset({
      name: content?.name ?? '',
      subject: content?.subject ?? '',
      template: content?.template ?? '',
      tag: content?.tag ?? '',
    });
    this.loaded.set(true);
    if (!content) return;

    const name = content.name ?? '';
    this.juicebox.setPageHeader({scope: `/main/communications/contents/details/${id}`, title: name});
    this.juicebox.navigationEvent({
      location: this.i18n.transform('communications'),
      subject: name,
      link: '/main/communications/contents',
    });
  }

  private async update(): Promise<void> {
    const content = this.content();
    if (!content) {
      this.juicebox.showToast('error', this.i18n.transform('can_not_update_content'));
      return;
    }
    const {name, subject, template, tag} = this.form.getRawValue();
    // A project's communications middleware may refuse the change
    const updated = await this.communications.updateContent(content._id, {
      name,
      subject,
      template,
      ...(this.tagsEnabled() && {tag}),
    });
    if (!updated) {
      this.juicebox.showToast('error', this.i18n.transform('can_not_update_content'));
      return;
    }
    this.form.markAsPristine();
  }
}
