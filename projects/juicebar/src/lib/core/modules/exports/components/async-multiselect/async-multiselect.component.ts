import {Component, input, ChangeDetectionStrategy, OnInit, effect} from '@angular/core';
import {Subject, of, Observable, combineLatest} from 'rxjs';
import {debounceTime, distinctUntilChanged, map, startWith, switchMap, filter, tap} from 'rxjs/operators';
import {FormGroup, ReactiveFormsModule} from '@angular/forms';
import {MatAutocompleteSelectedEvent, MatAutocompleteModule} from '@angular/material/autocomplete';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {ExportsTranslationPipe} from '../../i18n/exports.translation';
import {ExportFilter, FilterOptions} from '../../types/ExportFilter';
import {ExportStrategy} from '../../types/ExportStrategy';
import {ExportsService} from '../../exports.service';
import {Result} from '../../../../shared/types/Result';
import {CommonModule} from '@angular/common';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatChipsModule} from '@angular/material/chips';
import {MatIconModule} from '@angular/material/icon';
import {SharedModule} from '../../../../shared/shared.module';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';

@Component({
    selector: 'app-export-multiselect-async',
    templateUrl: './async-multiselect.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatAutocompleteModule,
        MatChipsModule,
        MatIconModule,
        MatProgressSpinnerModule,
        SharedModule,
        ExportsTranslationPipe
    ]
})
export class AsyncMultiselectComponent implements OnInit {
    filter = input.required<ExportFilter>();
    selectedDataSourceKey = input.required<ExportStrategy>();
    formGroup = input.required<FormGroup>();

    constructor(private readonly exportsService: ExportsService,
                private readonly juicebox: JuiceboxService) {
      this.language = this.juicebox.getLanguage();
      this.i18n = new ExportsTranslationPipe(this.juicebox);
    }

    private readonly language: string;
    private readonly i18n: ExportsTranslationPipe;

    // TODO: (onScrollToEnd) in the ng-select is not working so pagination is not implemented
    private readonly PAGE_SIZE = 20;
    private initialLoad = true;

    loading = false;
    input$ = new Subject<string>();
    selectedItems: FilterOptions[] = [];

    items$ = this.input$.pipe(
        startWith('initial'),
        distinctUntilChanged(),
        debounceTime(500),
        tap(() => this.loading = true),
        switchMap(input => {
            // Empty value clears the items
            if (input === '') {
                return of({success: true, payload: []} as Result<FilterOptions[]>);
            }
            return this.getFilterOptions(input, 0, this.initialLoad);
        }),
        tap((result) => {
            this.initialLoad = false;
            if (!result.success) {
                this.juicebox.showToast('error', this.i18n.transform('error'), result.error);
            }
        }),
        map(result => result?.payload ?? []),
        tap(() => this.loading = false)
    );

    filteredItems$!: Observable<FilterOptions[]>;

    ngOnInit() {
        this.filteredItems$ = combineLatest([
            this.items$,
            this.formGroup().get(this.filter().id)?.valueChanges.pipe(startWith([])) || of([])
        ]).pipe(
            map(([items, selectedIds]) => {
                this.updateSelectedItems(selectedIds, items);
                return items.filter(item => !this.isSelected(item));
            })
        );
    }

    get allFilterValues(): Array<{ id: string, value: any }> {
        const objectValue = this.formGroup().getRawValue();
        let allValues = [];
        for (const key in objectValue) {
            allValues.push({
                id: key,
                value: objectValue[key]
            });
        }
        return allValues;
    }

    private getFilterOptions(term: string, page: number, initialData = false) {
        return this.exportsService.getFilterOptions(this.filter().id, this.selectedDataSourceKey().key, this.allFilterValues, {
            term,
            page,
            pageSize: this.PAGE_SIZE,
            language: this.language
        }, initialData);
    }

    clearOptions() {
        this.input$.next('');
    }

    onSearchInput(event: Event): void {
        const target = event.target as HTMLInputElement;
        this.input$.next(target.value);
    }

    onOptionSelected(event: MatAutocompleteSelectedEvent): void {
        const selectedItem = event.option.value as FilterOptions;
        const currentValue = this.formGroup().get(this.filter().id)?.value || [];
        const newValue = [...currentValue, selectedItem.id];

        this.formGroup().get(this.filter().id)?.setValue(newValue);

        // Clear the input
        const input = event.option.getLabel();
        if (event.option.viewValue) {
            (event.option as any)._element.nativeElement.querySelector('input')?.focus();
        }

        // Clear search input
        setTimeout(() => {
            const searchInput = document.querySelector('input[matChipInputFor]') as HTMLInputElement;
            if (searchInput) {
                searchInput.value = '';
                this.input$.next('');
            }
        });
    }

    removeItem(item: FilterOptions): void {
        const currentValue = this.formGroup().get(this.filter().id)?.value || [];
        const newValue = currentValue.filter((id: string) => id !== item.id);
        this.formGroup().get(this.filter().id)?.setValue(newValue);
    }

    clearAll(): void {
        this.formGroup().get(this.filter().id)?.setValue([]);
        this.selectedItems = [];
    }

    isSelected(item: FilterOptions): boolean {
        const currentValue = this.formGroup().get(this.filter().id)?.value || [];
        return currentValue.includes(item.id);
    }

    trackByFn(index: number, item: FilterOptions): string {
        return item.id;
    }

    displayWith = (item: FilterOptions): string => {
        return item ? item.label : '';
    }

    private updateSelectedItems(selectedIds: string[], allItems: FilterOptions[]): void {
        this.selectedItems = selectedIds.map(id => 
            allItems.find(item => item.id === id) || 
            this.selectedItems.find(item => item.id === id)
        ).filter(Boolean) as FilterOptions[];
    }
}
