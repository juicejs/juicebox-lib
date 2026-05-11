import { Component, input, output, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OverlayModule } from '@angular/cdk/overlay';
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
    CommonModule,
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

  openKey = signal<string | null>(null);

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

  onFilterSelected(filterKey: string, value: any) {
    this.filterChanged.emit({ key: filterKey, value });
    this.close();
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
