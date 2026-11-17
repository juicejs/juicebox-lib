import {Component, inject} from '@angular/core';
import {DIALOG_DATA, DialogContentComponent, DialogTitleComponent} from '../../../../../ui-components';
import {EntitiesTranslationPipe} from '../../i18n/entities.translation';

/** An e-mail's text as the mailing provider kept it; Angular takes scripts and the like out of it */
@Component({
  selector: 'app-email-preview-dialog',
  template: `
    <app-dialog-title>{{ 'email_preview' | translate }}</app-dialog-title>
    <app-dialog-content>
      <div [innerHTML]="template"></div>
    </app-dialog-content>
  `,
  imports: [DialogTitleComponent, DialogContentComponent, EntitiesTranslationPipe],
  providers: [EntitiesTranslationPipe],
})
export class EmailPreviewDialogComponent {
  protected readonly template = inject<string>(DIALOG_DATA);
}
