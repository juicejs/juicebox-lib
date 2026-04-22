import { Component, input, output, OnInit, ChangeDetectionStrategy } from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {FormsModule} from '@angular/forms';

export interface FilterConfig {
  key: string;
  label: string;
  icon: string;
  placeholder: string;
  options: any[];
  selectedValue: any;
  displayProperty?: string; // property to display in button (e.g., 'name')
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
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule
  ]
})
export class FilterBarComponent implements OnInit {

  filters = input<FilterConfig[]>([]);
  filterChanged = output<{key: string, value: any}>();
  filterSearched = output<{key: string, term: string}>();

  ngOnInit() {
  }

  onFilterSelected(filterKey: string, value: any) {
    // Update the selected value in the config
    const filter = this.filters().find(f => f.key === filterKey);
    if (filter) {
      filter.selectedValue = value;
    }

    this.filterChanged.emit({key: filterKey, value});
  }

  onFilterSearch(filterKey: string, term: string) {
    this.filterSearched.emit({key: filterKey, term});
  }

  getDisplayValue(filter: FilterConfig): string {
    if (filter.selectedValue && filter.displayProperty) {
      return filter.selectedValue[filter.displayProperty];
    }
    return filter.selectedValue || filter.label;
  }

  displayFunction = (value: any): string => {
    if (!value) return '';
    // Find which filter this value belongs to by checking all filters
    for (const filter of this.filters()) {
      if (filter.options.includes(value)) {
        return filter.displayProperty ? value[filter.displayProperty] : value;
      }
    }
    return '';
  };

}
