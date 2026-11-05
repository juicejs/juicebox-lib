import { Component, input, output, ChangeDetectionStrategy, signal, afterRenderEffect, ElementRef, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkOverlayOrigin, OverlayModule } from '@angular/cdk/overlay';
import { ButtonComponent, IconComponent } from '../../../../ui-components';

export interface FilterConfig {
  key: string;
  label: string;
  icon: string;
  placeholder: string;
  options: any[];
  selectedValue: any;
  displayProperty?: string;
  searchFunction?: (term: string) => void;
}

@Component({
  selector: 'filter-bar',
  templateUrl: './filter-bar.component.html',
  styleUrls: ['./filter-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    OverlayModule,
    ButtonComponent,
    IconComponent
]
})
export class FilterBarComponent {

  filters = input<FilterConfig[]>([]);
  filterChanged = output<{ key: string, value: any }>();
  filterSearched = output<{ key: string, term: string }>();
  /**
   * The open filter's options reached their end (scrolled to it, or they don't fill the panel), e.g. to load the
   * next page, as ng-select's scrollToEnd did. Emits the filter's key.
   */
  filterScrolledToEnd = output<string>();

  openKey = signal<string | null>(null);

  /** The open filter's options list; only one filter is open at a time */
  private readonly optionsList = viewChild<ElementRef<HTMLElement>>('optionsList');

  constructor() {
    // Options that don't fill the panel can't be scrolled, so their end is reported once they are shown
    afterRenderEffect(() => {
      this.filters();
      const key = this.openKey();
      const list = this.optionsList()?.nativeElement;
      if (key && list) this.emitIfAtEnd(key, list);
    });
  }

  protected onOptionsScroll(key: string, event: Event) {
    this.emitIfAtEnd(key, event.target as HTMLElement);
  }

  private emitIfAtEnd(key: string, list: HTMLElement) {
    if (list.scrollTop + list.clientHeight >= list.scrollHeight - 24) this.filterScrolledToEnd.emit(key);
  }

  isOpen(key: string): boolean {
    return this.openKey() === key;
  }

  toggle(key: string) {
    this.openKey.update(k => (k === key ? null : key));
    if (this.openKey() === key) {
      this.filterSearched.emit({ key, term: '' });
    }
  }

  close() {
    this.openKey.set(null);
  }

  // No backdrop, so a click on another filter opens that one straight away
  onOutsideClick(event: MouseEvent, key: string, origin: CdkOverlayOrigin) {
    // The filter's own button toggles its panel
    if (origin.elementRef.nativeElement.contains(event.target as Node)) {
      return;
    }
    this.closeFilter(key);
  }

  // Closes this filter's panel unless another filter has opened meanwhile (also on Escape)
  closeFilter(key: string) {
    this.openKey.update(k => (k === key ? null : k));
  }

  onFilterSelected(filterKey: string, value: any) {
    this.filterChanged.emit({ key: filterKey, value });
    this.close();
  }

  clearSelection(filterKey: string, event: Event) {
    event.stopPropagation();
    this.filterChanged.emit({ key: filterKey, value: null });
  }

  onFilterSearch(filterKey: string, term: string) {
    this.filterSearched.emit({ key: filterKey, term });
  }

  getDisplayValue(filter: FilterConfig): string {
    if (filter.selectedValue && filter.displayProperty) {
      return filter.selectedValue[filter.displayProperty];
    }
    return filter.selectedValue || filter.label;
  }

  optionLabel(option: any, filter: FilterConfig): string {
    return filter.displayProperty ? option[filter.displayProperty] : option;
  }
}
