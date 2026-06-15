import {Component, inject, input, ChangeDetectionStrategy, signal, computed, ViewChild, ElementRef, OnInit} from '@angular/core';
import {Subject, of, combineLatest, Observable} from 'rxjs';
import {debounceTime, distinctUntilChanged, map, startWith, switchMap, tap} from 'rxjs/operators';
import {FormGroup, ReactiveFormsModule} from '@angular/forms';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {ExportsTranslationPipe} from '../../i18n/exports.translation';
import {ExportFilter, FilterOptions} from '../../types/ExportFilter';
import {ExportStrategy} from '../../types/ExportStrategy';
import {ExportsService} from '../../exports.service';
import {Result} from '../../../../shared/types/Result';
import {CommonModule} from '@angular/common';
import {SharedModule} from '../../../../shared/shared.module';

@Component({
    selector: 'app-export-multiselect-async',
    templateUrl: './async-multiselect.component.html',
    styleUrls: ['./async-multiselect.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        SharedModule,
        ExportsTranslationPipe
    ]
})
export class AsyncMultiselectComponent implements OnInit {
    filter = input.required<ExportFilter>();
    selectedDataSourceKey = input.required<ExportStrategy>();
    formGroup = input.required<FormGroup>();

    @ViewChild('searchInput') searchInputEl?: ElementRef<HTMLInputElement>;

    private readonly exportsService = inject(ExportsService);
    private readonly juicebox = inject(JuiceboxService);
    private readonly i18n = new ExportsTranslationPipe(this.juicebox);
    private readonly language = this.juicebox.getLanguage();
    private readonly PAGE_SIZE = 20;

    private readonly initialLoad = signal(true);
    readonly loading = signal(false);
    readonly selectedItems = signal<FilterOptions[]>([]);

    readonly hasSelected = computed(() => this.selectedItems().length > 0);

    readonly input$ = new Subject<string>();
    filteredItems$!: Observable<FilterOptions[]>;

    readonly items$ = this.input$.pipe(
        startWith('initial'),
        distinctUntilChanged(),
        debounceTime(500),
        tap(() => this.loading.set(true)),
        switchMap(input => {
            if (input === '') {
                return of({success: true, payload: []} as Result<FilterOptions[]>);
            }
            return this.getFilterOptions(input, 0, this.initialLoad());
        }),
        tap(result => {
            this.initialLoad.set(false);
            if (!result.success) {
                this.juicebox.showToast('error', this.i18n.transform('error'), result.error);
            }
        }),
        map(result => result?.payload ?? []),
        tap(() => this.loading.set(false))
    );

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

    private getFilterOptions(term: string, page: number, initialData = false) {
        const allValues = Object.entries(this.formGroup().getRawValue())
            .map(([id, value]) => ({id, value}));

        return this.exportsService.getFilterOptions(
            this.filter().id,
            this.selectedDataSourceKey().key,
            allValues,
            {term, page, pageSize: this.PAGE_SIZE, language: this.language},
            initialData
        );
    }

    clearOptions() {
        this.input$.next('');
    }

    onSearchInput(event: Event): void {
        this.input$.next((event.target as HTMLInputElement).value);
    }

    onOptionSelected(selectedItem: FilterOptions): void {
        const control = this.formGroup().get(this.filter().id);
        const currentValue = control?.value || [];
        control?.setValue([...currentValue, selectedItem.id]);

        if (this.searchInputEl) {
            this.searchInputEl.nativeElement.value = '';
            this.input$.next('');
        }
    }

    removeItem(item: FilterOptions): void {
        const control = this.formGroup().get(this.filter().id);
        const newValue = (control?.value || []).filter((id: string) => id !== item.id);
        control?.setValue(newValue);
    }

    clearAll(): void {
        this.formGroup().get(this.filter().id)?.setValue([]);
        this.selectedItems.set([]);
    }

    isSelected(item: FilterOptions): boolean {
        return (this.formGroup().get(this.filter().id)?.value || []).includes(item.id);
    }

    private updateSelectedItems(selectedIds: string[], allItems: FilterOptions[]): void {
        this.selectedItems.set(
            selectedIds
                .map(id => allItems.find(item => item.id === id) ?? this.selectedItems().find(item => item.id === id))
                .filter(Boolean) as FilterOptions[]
        );
    }
}
