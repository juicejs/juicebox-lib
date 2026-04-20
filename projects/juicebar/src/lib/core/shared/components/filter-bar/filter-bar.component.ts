import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';

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
  styleUrls: ['./filter-bar.component.scss']
})
export class FilterBarComponent implements OnInit {

  @Input() filters: FilterConfig[] = [];
  @Output() filterChanged = new EventEmitter<{key: string, value: any}>();
  @Output() filterSearched = new EventEmitter<{key: string, term: string}>();

  ngOnInit() {
  }

  onFilterSelected(filterKey: string, value: any) {
    // Update the selected value in the config
    const filter = this.filters.find(f => f.key === filterKey);
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
    for (const filter of this.filters) {
      if (filter.options.includes(value)) {
        return filter.displayProperty ? value[filter.displayProperty] : value;
      }
    }
    return '';
  };

}
