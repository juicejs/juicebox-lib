import {Component, computed, signal} from '@angular/core';
import {FormFieldComponent, LabelComponent, OptionComponent, SelectComponent} from '../../../../../../ui-components';
import {CommunicationsTranslationPipe} from '../../../i18n/communications.translation';
import {PLACEHOLDER_KINDS} from './content-placeholders';

const KINDS_BY_NAME = new Map(PLACEHOLDER_KINDS.map(kind => [kind.name, kind.placeholders]));

/** The placeholder reference beside a content's text: the placeholders of the kind of data chosen, to copy by hand */
@Component({
  selector: 'app-content-placeholders',
  templateUrl: './content-placeholders.component.html',
  styleUrl: './content-placeholders.component.scss',
  imports: [FormFieldComponent, LabelComponent, SelectComponent, OptionComponent, CommunicationsTranslationPipe],
  providers: [CommunicationsTranslationPipe],
})
export class ContentPlaceholdersComponent {
  protected readonly kinds = PLACEHOLDER_KINDS.map(kind => kind.name);
  protected readonly kind = signal<string | null>(null);
  protected readonly placeholders = computed(() => KINDS_BY_NAME.get(this.kind() ?? '') ?? []);
}
