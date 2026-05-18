import {
  Component, ChangeDetectionStrategy, ViewEncapsulation, input, output, model, signal,
  contentChildren, computed, ElementRef, inject, AfterContentInit, OnDestroy,
  ViewChild, forwardRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

@Component({
  selector: 'app-option',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
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
  imports: [CommonModule, OverlayModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    }
  ]
})
export class SelectComponent implements AfterContentInit, OnDestroy, ControlValueAccessor {
  value = model<any>(null);
  disabled = input<boolean>(false);
  placeholder = input<string>('Select an option');
  searchable = input<boolean>(false);
  searchPlaceholder = input<string>('Search...');

  selectionChange = output<{ value: any }>();

  isOpen = signal(false);
  searchQuery = signal('');
  private storedLabel = signal<string>('');

  @ViewChild('searchInput') searchInputEl?: ElementRef<HTMLInputElement>;

  private options = contentChildren(OptionComponent);

  private onChange: (v: any) => void = () => {};
  private onTouched: () => void = () => {};

  protected readonly displayValue = computed(() => {
    // First try to find the label from current options (works when open or options loaded)
    const val = this.value();
    if (val === null || val === undefined) return '';
    const opts = this.options();
    const match = opts.find(o => this.equals(o.value(), val));
    if (match) {
      const label = match.getLabel();
      if (label) return label;
    }
    // Fall back to stored label (set when user picks an option)
    return this.storedLabel();
  });

  protected readonly selectedValue = computed(() => this.value());

  protected readonly filteredOptions = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.options();
    return this.options().filter(o =>
      o.getLabel().toLowerCase().includes(query)
    );
  });

  ngAfterContentInit() {}
  ngOnDestroy() {}

  toggle() {
    if (!this.disabled()) {
      if (this.isOpen()) {
        this.close();
      } else {
        this.open();
      }
    }
  }

  open() {
    this.isOpen.set(true);
    this.searchQuery.set('');
    setTimeout(() => this.searchInputEl?.nativeElement.focus(), 50);
  }

  close() {
    this.isOpen.set(false);
    this.searchQuery.set('');
    this.onTouched();
  }

  select(option: OptionComponent) {
    if (option.disabled()) return;
    this.storedLabel.set(option.getLabel());
    this.value.set(option.value());
    this.onChange(option.value());
    this.selectionChange.emit({ value: option.value() });
    this.close();
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

  registerOnChange(fn: (v: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}
