import {Component, computed, inject, OnInit, signal} from '@angular/core';
import {DialogRef} from '@angular/cdk/dialog';
import {
  ButtonComponent,
  DIALOG_DATA,
  DialogActionsComponent,
  DialogContentComponent,
  DialogTitleComponent,
  FormFieldComponent,
  LabelComponent,
  OptionComponent,
  SelectComponent,
} from '../../../../../../ui-components';
import {PromiseButtonDirective} from '../../../../../shared/directives/PromiseButton';
import {ConfigurationService} from '../../../../../shared/services/configuration.service';
import {JuiceboxService} from '../../../../../shared/services/Juicebox.service';
import {attributeName, loadEntityAttributes} from '../../../entities-shared';
import {EntitiesService} from '../../../entities.service';
import {EntityAttribute} from '../../../entities.types';
import {ATTRIBUTE_ENTITY_TYPES} from '../../../entity-form';
import {EntitiesTranslationPipe} from '../../../i18n/entities.translation';

/**
 * Deletes an attribute field of the customer's type: the type is the customer's and cannot be changed (a customer
 * without a type lets it be chosen), the field is chosen from that type's. Closes with `true` once the backend
 * removed the field; its refusal is shown in the dialog. Customers keep the values they hold for the field.
 */
@Component({
  selector: 'app-delete-attribute-dialog',
  templateUrl: './delete-attribute-dialog.component.html',
  styleUrl: '../attribute-dialog.scss',
  imports: [
    DialogTitleComponent,
    DialogContentComponent,
    DialogActionsComponent,
    FormFieldComponent,
    LabelComponent,
    SelectComponent,
    OptionComponent,
    ButtonComponent,
    PromiseButtonDirective,
    EntitiesTranslationPipe,
  ],
  providers: [EntitiesTranslationPipe],
})
export class DeleteAttributeDialogComponent implements OnInit {
  private readonly entities = inject(EntitiesService);
  private readonly configuration = inject(ConfigurationService);
  private readonly juicebox = inject(JuiceboxService);
  private readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);
  private readonly i18n = inject(EntitiesTranslationPipe);
  /** The customer's type, or null for a customer without one */
  private readonly customerType = inject<string | null>(DIALOG_DATA, {optional: true})?.toLowerCase() ?? null;

  protected readonly typeFixed = !!this.customerType;
  protected readonly entityType = signal<string | null>(this.customerType);
  protected readonly entityTypes = [...new Set([...ATTRIBUTE_ENTITY_TYPES, ...(this.customerType ? [this.customerType] : [])])]
    .map(type => ({type, name: nameOf(this.i18n.transform(type), type)}));
  private readonly allAttributes = signal<EntityAttribute[]>([]);
  protected readonly attributes = computed(() => {
    const model = `entity:${this.entityType()}`;
    const language = this.juicebox.getLanguage();
    return this.allAttributes()
      .filter(attribute => attribute.model === model)
      .map(attribute => ({key: attribute.key, name: attributeName(attribute, this.i18n, language)}));
  });
  protected readonly attribute = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);
  protected readonly deletePromise = signal<Promise<void> | null>(null);

  async ngOnInit(): Promise<void> {
    this.allAttributes.set(await loadEntityAttributes(this.configuration));
  }

  protected selectType(type: string | null): void {
    this.entityType.set(type);
    this.attribute.set(null);
  }

  protected remove(): void {
    this.deletePromise.set(this.deleteAttribute());
  }

  protected cancel(): void {
    this.dialogRef.close(false);
  }

  private async deleteAttribute(): Promise<void> {
    const key = this.attribute();
    if (!key) return;
    this.message.set(null);
    // The backend takes the field's configuration as it is stored
    const stored = await this.configuration.getByKey(key);
    const result = await this.entities.deleteAttribute(stored?.payload);
    if (result?.success) {
      this.dialogRef.close(true);
    } else {
      this.message.set(result?.error ?? String(this.i18n.transform('error')));
    }
  }
}

/** The dictionary's text, or the type's own value where it has none */
function nameOf(text: unknown, type: string): string {
  return typeof text === 'string' && !text.startsWith('@') ? text : type;
}
