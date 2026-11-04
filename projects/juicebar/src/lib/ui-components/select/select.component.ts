import {
  Component, ChangeDetectionStrategy, ViewEncapsulation, input, output, model, signal,
  contentChildren, computed, ElementRef, inject, AfterContentInit, OnDestroy,
  forwardRef, linkedSignal, DOCUMENT, afterRenderEffect, viewChild
} from '@angular/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { FormFieldComponent } from '../form-field/form-field.component';
import { DISABLEABLE, Disableable } from '../disableable';

let nextSelectId = 0;

@Component({
  selector: 'app-option',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  host: {
    'class': 'app-option',
    '[class.app-option-selected]': 'selected()',
    '[class.app-option-disabled]': 'disabled()',
    '[attr.aria-disabled]': 'disabled()',
  }
})
export class OptionComponent {
  value = input.required<any>();
  disabled = input<boolean>(false);
  selected = model<boolean>(false);

  readonly el = inject(ElementRef<HTMLElement>);

  getLabel(): string {
    return this.el.nativeElement.textContent?.trim() ?? '';
  }
}

@Component({
  selector: 'app-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [OverlayModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    },
    { provide: DISABLEABLE, useExisting: forwardRef(() => SelectComponent) },
  ]
})
export class SelectComponent implements AfterContentInit, OnDestroy, ControlValueAccessor, Disableable {
  value = model<any>(null);
  disabled = input<boolean>(false);
  placeholder = input<string>('Select an option');
  searchable = input<boolean>(false);
  searchPlaceholder = input<string>('Search...');
  multiple = input<boolean>(false);
  /** The typed search only goes out through `searchChange`; the options are not filtered here (a server search) */
  externalSearch = input<boolean>(false);
  /** Shows a × that empties a single selection, like ng-select's clear button */
  clearable = input<boolean>(false);
  clearLabel = input<string>('Clear');

  selectionChange = output<{ value: any }>();
  /** The text typed in the search field ('' when it is cleared) */
  searchChange = output<string>();
  /**
   * The end of the options list is in view, e.g. to load the next page (ng-select's scrollToEnd).
   * Also when the options don't fill the panel, since a list that can't scroll never reaches its end otherwise.
   */
  scrolledToEnd = output<void>();

  /** The trigger button gets the form field's control id, so the field's app-label labels it */
  protected readonly triggerId = inject(FormFieldComponent, { optional: true })?.controlId;
  /** ids for the listbox and its options (aria-controls, aria-activedescendant) */
  protected readonly panelId = `app-select-${nextSelectId++}`;
  protected readonly optionIdPrefix = `${this.panelId}-option-`;

  /** Disabled by the `disabled` input, the form control (`control.disable()`) or a permission directive */
  private readonly formDisabled = signal(false);
  private readonly externallyDisabled = signal(false);
  protected readonly isDisabled = computed(() => this.disabled() || this.formDisabled() || this.externallyDisabled());

  isOpen = signal(false);
  searchQuery = signal('');
  private storedLabel = signal<string>('');

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private readonly triggerButton = viewChild<ElementRef<HTMLButtonElement>>('triggerButton');
  /** The options list; only there while the panel is open */
  private readonly optionsList = viewChild<ElementRef<HTMLElement>>('optionsList');
  private readonly document = inject(DOCUMENT);

  private options = contentChildren(OptionComponent);

  private onChange: (v: any) => void = () => {};
  private onTouched: () => void = () => {};

  protected readonly displayValue = computed(() => {
    if (this.multiple()) return '';
    const val = this.value();
    if (val === null || val === undefined) return '';
    const opts = this.options();
    const match = opts.find(o => this.equals(o.value(), val));
    if (match) {
      const label = match.getLabel();
      if (label) return label;
    }
    return this.storedLabel();
  });

  protected readonly selectedValue = computed(() => this.value());

  protected readonly showClear = computed(() => {
    const val = this.value();
    return this.clearable() && !this.multiple() && !this.isDisabled() && val !== null && val !== undefined && val !== '';
  });

  protected readonly selectedArray = computed<any[]>(() => {
    if (!this.multiple()) return [];
    const val = this.value();
    return Array.isArray(val) ? val : [];
  });

  protected readonly selectedCount = computed(() => this.selectedArray().length);

  protected readonly selectedLabels = computed(() => {
    const sel = this.selectedArray();
    const opts = this.options();
    return sel.map(v => {
      const match = opts.find(o => this.equals(o.value(), v));
      return match ? match.getLabel() : '';
    }).filter(Boolean);
  });

  protected readonly totalCount = computed(() => this.options().length);

  protected readonly filteredOptions = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query || this.externalSearch()) return this.options();
    return this.options().filter(o =>
      o.getLabel().toLowerCase().includes(query)
    );
  });

  /**
   * The highlighted option, as in ng-select: moved with the arrow keys or the mouse, chosen with Enter.
   * A new search highlights the first result; options added below the others (the next page) leave it in place.
   */
  protected readonly activeIndex = linkedSignal<readonly OptionComponent[], number>({
    source: this.filteredOptions,
    computation: (options, previous) => {
      if (!previous) return 0;
      const before = previous.source;
      const added = options.length > before.length && before.every((option, i) => options[i] === option);
      return added ? previous.value : 0;
    },
  });
  protected readonly activeOptionId = computed(() =>
    this.isOpen() && this.filteredOptions()[this.activeIndex()] ? this.optionId(this.activeIndex()) : null,
  );

  /** Letters typed in a row, to pick an option by its label (type-ahead) */
  private typedKeys = '';
  private typedKeysTimer?: ReturnType<typeof setTimeout>;

  protected readonly allFilteredSelected = computed(() => {
    const filtered = this.filteredOptions();
    if (!filtered.length) return false;
    const sel = this.selectedArray();
    return filtered.every(o => sel.some(v => this.equals(v, o.value())));
  });

  constructor() {
    // Options that don't fill the panel can't be scrolled, so their end is reported once they are shown
    afterRenderEffect(() => {
      this.filteredOptions();
      const list = this.optionsList()?.nativeElement;
      if (list) this.emitIfAtEnd(list);
    });
  }

  ngAfterContentInit() {}
  ngOnDestroy() {}

  toggle() {
    if (!this.isDisabled()) {
      if (this.isOpen()) {
        this.close();
      } else {
        this.open();
      }
    }
  }

  open() {
    if (this.isDisabled() || this.isOpen()) return;
    this.isOpen.set(true);
    this.setSearchQuery('');
    this.activateSelectedOrFirst();
    setTimeout(() => this.searchInput()?.nativeElement.focus(), 50);
  }

  protected setSearchQuery(query: string) {
    if (query === this.searchQuery()) return;
    this.searchQuery.set(query);
    this.searchChange.emit(query);
  }

  protected onOptionsScroll(event: Event) {
    this.emitIfAtEnd(event.target as HTMLElement);
  }

  private emitIfAtEnd(list: HTMLElement) {
    if (list.scrollTop + list.clientHeight >= list.scrollHeight - 24) this.scrolledToEnd.emit();
  }

  /** `restoreFocus` returns focus to the trigger, e.g. after Escape or a choice made with the keyboard */
  close(restoreFocus = false) {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.setSearchQuery('');
    this.onTouched();
    if (restoreFocus) this.triggerButton()?.nativeElement.focus();
  }

  /** Keys on the trigger and in the search field, as ng-select handled them */
  protected onKeydown(event: KeyboardEvent) {
    if (this.isDisabled()) return;
    const inSearch = event.target === this.searchInput()?.nativeElement;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        if (!this.isOpen()) {
          this.open();
        } else {
          this.moveActive(event.key === 'ArrowDown' ? 1 : -1);
        }
        return;
      case 'Home':
      case 'End':
        if (!this.isOpen() || inSearch) return;
        event.preventDefault();
        this.setActive(event.key === 'Home' ? this.firstEnabled(0, 1) : this.firstEnabled(this.filteredOptions().length - 1, -1));
        return;
      case 'Enter':
        event.preventDefault();
        if (!this.isOpen()) {
          this.open();
          return;
        }
        this.chooseActive();
        return;
      case ' ':
        if (inSearch) return;
        event.preventDefault();
        this.open();
        return;
      case 'Escape':
        if (!this.isOpen()) return;
        event.preventDefault();
        this.close(true);
        return;
      case 'Tab':
        if (!this.isOpen()) return;
        // The panel is not in the page's tab order: close it and continue from the trigger
        if (inSearch) {
          event.preventDefault();
          this.close(true);
        } else {
          this.close();
        }
        return;
    }
    if (!inSearch && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      this.typeAhead(event.key);
    }
  }

  protected onTriggerBlur() {
    if (!this.isOpen()) this.onTouched();
  }

  private optionId(index: number): string {
    return this.optionIdPrefix + index;
  }

  protected setActive(index: number) {
    if (index < 0) return;
    this.activeIndex.set(index);
    // Keep the highlighted option in view once the panel has rendered it
    setTimeout(() => this.document.getElementById(this.optionId(index))?.scrollIntoView({ block: 'nearest' }));
  }

  private activateSelectedOrFirst() {
    const options = this.filteredOptions();
    const selected = options.findIndex(o => this.isSelected(o));
    this.setActive(selected >= 0 ? selected : this.firstEnabled(0, 1));
  }

  private moveActive(step: 1 | -1) {
    const options = this.filteredOptions();
    if (!options.length) return;
    let index = this.activeIndex();
    for (let i = 0; i < options.length; i++) {
      index = (index + step + options.length) % options.length;
      if (!options[index].disabled()) break;
    }
    this.setActive(index);
  }

  private firstEnabled(from: number, step: 1 | -1): number {
    const options = this.filteredOptions();
    for (let i = from; i >= 0 && i < options.length; i += step) {
      if (!options[i].disabled()) return i;
    }
    return -1;
  }

  private chooseActive() {
    const option = this.filteredOptions()[this.activeIndex()];
    if (!option) return;
    this.select(option);
  }

  /** As in ng-select: on a closed select the typed label is chosen, on an open one it is highlighted */
  private typeAhead(key: string) {
    clearTimeout(this.typedKeysTimer);
    this.typedKeys += key.toLocaleLowerCase();
    this.typedKeysTimer = setTimeout(() => (this.typedKeys = ''), 500);
    const options = this.filteredOptions();
    const index = options.findIndex(o => !o.disabled() && o.getLabel().toLocaleLowerCase().startsWith(this.typedKeys));
    if (index < 0) return;
    if (this.isOpen() || this.multiple()) {
      if (!this.isOpen()) this.open();
      this.setActive(index);
    } else {
      this.select(options[index]);
    }
  }

  select(option: OptionComponent) {
    if (option.disabled()) return;

    if (this.multiple()) {
      const current = this.selectedArray();
      const exists = current.some(v => this.equals(v, option.value()));
      const next = exists
        ? current.filter(v => !this.equals(v, option.value()))
        : [...current, option.value()];
      this.value.set(next);
      this.onChange(next);
      this.selectionChange.emit({ value: next });
    } else {
      this.storedLabel.set(option.getLabel());
      this.value.set(option.value());
      this.onChange(option.value());
      this.selectionChange.emit({ value: option.value() });
      // Focus stays on the select, as it did with ng-select (the search field closes with the panel)
      this.close(true);
    }
  }

  /** Empties the selection; the value becomes null, as with ng-select's clear button */
  clear() {
    this.storedLabel.set('');
    this.value.set(null);
    this.onChange(null);
    this.onTouched();
    this.selectionChange.emit({ value: null });
    this.close();
    // The × goes away once the value is empty, so focus moves to the select itself
    this.triggerButton()?.nativeElement.focus();
  }

  isSelected(option: OptionComponent): boolean {
    if (this.multiple()) {
      return this.selectedArray().some(v => this.equals(v, option.value()));
    }
    return this.equals(this.value(), option.value());
  }

  selectAll() {
    const next = this.filteredOptions()
      .filter(o => !o.disabled())
      .map(o => o.value());
    // merge with any already-selected options outside the filtered set
    const outside = this.selectedArray().filter(
      v => !this.filteredOptions().some(o => this.equals(o.value(), v))
    );
    const merged = [...outside, ...next];
    this.value.set(merged);
    this.onChange(merged);
    this.selectionChange.emit({ value: merged });
  }

  clearAll() {
    // only clear options visible in current filter, keep others
    const outside = this.selectedArray().filter(
      v => !this.filteredOptions().some(o => this.equals(o.value(), v))
    );
    this.value.set(outside);
    this.onChange(outside);
    this.selectionChange.emit({ value: outside });
  }

  protected equals(a: any, b: any): boolean {
    if (a === b) return true;
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      if (a._id !== undefined) return a._id === b._id;
      if (a.id !== undefined) return a.id === b.id;
    }
    return false;
  }

  // ControlValueAccessor
  writeValue(val: any): void {
    this.value.set(val);
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
    if (isDisabled) this.close();
  }

  setExternallyDisabled(disabled: boolean): void {
    this.externallyDisabled.set(disabled);
    if (disabled) this.close();
  }

  registerOnChange(fn: (v: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}
