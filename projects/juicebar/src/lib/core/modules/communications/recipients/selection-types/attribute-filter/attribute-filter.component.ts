import {Component, computed, inject, input, OnInit, output, signal} from '@angular/core';
import {
  ButtonComponent,
  FormFieldComponent,
  IconComponent,
  LabelComponent,
  OptionComponent,
  SelectComponent,
  SlideToggleComponent,
} from '../../../../../../ui-components';
import {CommunicationsTranslationPipe} from '../../../i18n/communications.translation';
import {RecipientDirectoryService} from '../../recipient-directory.service';
import {ChoiceOption} from '../../recipients.types';

interface AttributeRow {
  id: number;
  attribute: string;
  value: string;
}

/**
 * Filter by attribute (ATTRFILTER): rows of an attribute and one of its values, starting with one. The attributes are
 * the `juicecommerce:entity:attribute` configurations, each property once; the values are the attribute's distinct
 * values among the organisation's customers, in alphabetical order. Gives `attribute:value` for each complete row.
 */
@Component({
  selector: 'app-attribute-filter-recipients',
  templateUrl: './attribute-filter.component.html',
  styleUrl: './attribute-filter.component.scss',
  imports: [
    FormFieldComponent,
    LabelComponent,
    SelectComponent,
    OptionComponent,
    ButtonComponent,
    IconComponent,
    SlideToggleComponent,
    CommunicationsTranslationPipe,
  ],
})
export class AttributeFilterComponent implements OnInit {
  private readonly directory = inject(RecipientDirectoryService);

  /** Changing a recipient: its parameters */
  readonly preset = input('');
  readonly paramsChange = output<string>();

  protected readonly attributes = signal<ChoiceOption[]>([]);
  private readonly rows = signal<AttributeRow[]>([]);
  private readonly values = signal<Readonly<Record<string, string[]>>>({});
  protected readonly rowViews = computed(() => {
    const values = this.values();
    return this.rows().map(row => ({...row, values: values[row.attribute] ?? []}));
  });
  private nextRowId = 0;

  ngOnInit(): void {
    const preset = this.preset();
    const rows = preset
      ? preset.split(',').map(pair => {
        const [attribute, value] = pair.split(':');
        return this.newRow(attribute ?? '', value ?? '');
      })
      : [this.newRow('', '')];
    this.rows.set(rows);
    for (const attribute of new Set(rows.map(row => row.attribute).filter(Boolean))) void this.loadValues(attribute);
    void this.loadAttributes();
  }

  protected add(): void {
    this.rows.update(rows => [...rows, this.newRow('', '')]);
  }

  /** Choosing an attribute only reads its values: the parameters are given when a value is chosen, as in the old forms */
  protected chooseAttribute(rowId: number, attribute: string | null): void {
    this.rows.update(rows => rows.map(row => row.id === rowId ? {...row, attribute: attribute ?? '', value: ''} : row));
    if (attribute) void this.loadValues(attribute);
  }

  protected chooseValue(rowId: number, value: string | null): void {
    this.rows.update(rows => rows.map(row => row.id === rowId ? {...row, value: value ?? ''} : row));
    this.emit();
  }

  private emit(): void {
    this.paramsChange.emit(this.rows()
      .filter(row => row.attribute && row.value)
      .map(row => `${row.attribute}:${row.value}`)
      .join(','));
  }

  private newRow(attribute: string, value: string): AttributeRow {
    return {id: this.nextRowId++, attribute, value};
  }

  private async loadAttributes(): Promise<void> {
    const result = await this.directory.fetchCustomerAttributes();
    if (!result?.success || !result.payload) return;
    const seen = new Set<string>();
    const attributes: ChoiceOption[] = [];
    for (const attribute of result.payload) {
      if (seen.has(attribute.property)) continue;
      seen.add(attribute.property);
      attributes.push({value: attribute.property, label: attribute.name ?? attribute.property});
    }
    this.attributes.set(attributes);
  }

  private async loadValues(attribute: string): Promise<void> {
    const result = await this.directory.searchAttributeValues(attribute);
    if (!result?.success || !result.payload) return;
    const values = result.payload
      .map(item => String(item.value))
      .sort((a, b) => a.localeCompare(b));
    this.values.update(known => ({...known, [attribute]: values}));
  }
}
