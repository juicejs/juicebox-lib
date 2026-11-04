import {Component, DestroyRef, inject, input, ChangeDetectionStrategy, signal, computed, effect, OnInit} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Subject, of, from, merge} from 'rxjs';
import {catchError, debounceTime, distinctUntilChanged, startWith, switchMap, tap} from 'rxjs/operators';
import {AbstractControl, FormGroup} from '@angular/forms';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {ExportsTranslationPipe} from '../../i18n/exports.translation';
import {ExportFilter, FilterOptions} from '../../types/ExportFilter';
import {ExportStrategy} from '../../types/ExportStrategy';
import {ExportsService} from '../../exports.service';
import {Result} from '../../../../shared/types/Result';
import {SharedModule} from '../../../../shared/shared.module';

let nextId = 0;

/**
 * Multi-select whose options are searched on the backend, as the old ng-select with `[typeahead]`:
 * the first request loads the initial options (`fetchInitialValues`, which also labels the saved selection),
 * then each typed term is searched; leaving the field clears the options.
 */
@Component({
    selector: 'app-export-multiselect-async',
    templateUrl: './async-multiselect.component.html',
    styleUrls: ['./async-multiselect.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        SharedModule,
        ExportsTranslationPipe
    ]
})
export class AsyncMultiselectComponent implements OnInit {
    filter = input.required<ExportFilter>();
    selectedDataSourceKey = input.required<ExportStrategy>();
    formGroup = input.required<FormGroup>();

    private readonly exportsService = inject(ExportsService);
    private readonly juicebox = inject(JuiceboxService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly i18n = new ExportsTranslationPipe(this.juicebox);
    private readonly language = this.juicebox.getLanguage();
    private readonly PAGE_SIZE = 20;

    private initialLoad = true;
    private readonly input$ = new Subject<string>();

    readonly loading = signal(false);
    /** Options of the last request */
    readonly items = signal<FilterOptions[]>([]);
    /** Labels of every option seen, so a chip keeps its label when the options change (as ng-select kept them) */
    private readonly labels = signal<Record<string, string>>({});
    readonly selectedIds = signal<string[]>([]);
    readonly disabled = signal(false);
    readonly open = signal(false);
    readonly searchTerm = signal('');
    readonly activeIndex = signal(-1);

    readonly selectedItems = computed(() => {
        const labels = this.labels();
        return this.selectedIds().map(id => ({id, label: labels[id] ?? id}));
    });
    readonly hasSelected = computed(() => this.selectedIds().length > 0);
    readonly showPanel = computed(() =>
        this.open() && !this.disabled() && (this.loading() || this.items().length > 0 || !!this.searchTerm()));
    /** The options in the list, each marked when it is selected */
    protected readonly options = computed(() => {
        const selected = new Set(this.selectedIds());
        return this.items().map(item => ({...item, selected: selected.has(item.id)}));
    });

    protected readonly listboxId = `export-multiselect-${nextId++}`;
    protected readonly optionIdPrefix = `${this.listboxId}-option-`;
    protected readonly activeOptionId = computed(() =>
        this.showPanel() && this.items()[this.activeIndex()] ? this.optionId(this.activeIndex()) : null);

    constructor() {
        // Follows the filter's control; the filter form is rebuilt when the filters change
        effect(onCleanup => {
            const control = this.control();
            if (!control) return;
            const sync = () => {
                this.selectedIds.set(Array.isArray(control.value) ? control.value : []);
                this.disabled.set(control.disabled);
                if (control.disabled) this.open.set(false);
            };
            sync();
            const subscription = merge(control.valueChanges, control.statusChanges).subscribe(sync);
            onCleanup(() => subscription.unsubscribe());
        });
    }

    ngOnInit() {
        // One stream for the component's lifetime, so no keystroke is lost and each term is requested once
        this.input$.pipe(
            startWith('initial'),
            distinctUntilChanged(),
            debounceTime(500),
            tap(() => this.loading.set(true)),
            switchMap(term => {
                // An empty term clears the options
                if (term === '') {
                    return of({success: true, payload: []} as Result<FilterOptions[]>);
                }
                return from(this.getFilterOptions(term, 0, this.initialLoad)).pipe(
                    catchError(() => of({success: false, payload: []} as Result<FilterOptions[]>))
                );
            }),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(result => {
            this.initialLoad = false;
            if (!result?.success) {
                this.juicebox.showToast('error', this.i18n.transform('error'), result?.error);
            }
            const items = result?.payload ?? [];
            this.rememberLabels(items);
            this.items.set(items);
            this.activeIndex.set(items.length ? 0 : -1);
            this.loading.set(false);
        });
    }

    private control(): AbstractControl | null {
        return this.formGroup().get(this.filter().id);
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

    private rememberLabels(items: FilterOptions[]) {
        if (!items.length) return;
        this.labels.update(labels => {
            const next = {...labels};
            for (const item of items) next[item.id] = item.label;
            return next;
        });
    }

    private setSelection(ids: string[]) {
        const control = this.control();
        if (!control) return;
        control.setValue(ids);
        control.markAsDirty();
        control.markAsTouched();
    }

    private optionId(index: number): string {
        return this.optionIdPrefix + index;
    }

    onSearchInput(event: Event): void {
        const term = (event.target as HTMLInputElement).value;
        this.searchTerm.set(term);
        this.open.set(true);
        this.input$.next(term);
    }

    onBlur(): void {
        this.open.set(false);
        this.control()?.markAsTouched();
        this.clearSearch();
    }

    /** Leaving the field or picking an option clears the search and the options, as the old one did */
    private clearSearch(): void {
        this.searchTerm.set('');
        this.input$.next('');
    }

    onKeydown(event: KeyboardEvent): void {
        const items = this.items();
        switch (event.key) {
            case 'ArrowDown':
            case 'ArrowUp': {
                event.preventDefault();
                this.open.set(true);
                if (!items.length) return;
                const step = event.key === 'ArrowDown' ? 1 : -1;
                this.activeIndex.set((this.activeIndex() + step + items.length) % items.length);
                return;
            }
            case 'Enter': {
                const item = items[this.activeIndex()];
                if (this.showPanel() && item) {
                    event.preventDefault();
                    this.toggle(item);
                }
                return;
            }
            case 'Escape':
                if (this.open()) {
                    event.preventDefault();
                    event.stopPropagation();
                    this.open.set(false);
                }
                return;
            case 'Backspace': {
                // As ng-select: Backspace in an empty search removes the last chip
                const ids = this.selectedIds();
                if (!this.searchTerm() && ids.length) this.setSelection(ids.slice(0, -1));
                return;
            }
        }
    }

    /** Clicking an option selects it, or unselects it when it is already selected (as in ng-select) */
    toggle(item: FilterOptions): void {
        if (this.disabled()) return;
        const ids = this.selectedIds();
        this.setSelection(ids.includes(item.id) ? ids.filter(id => id !== item.id) : [...ids, item.id]);
        this.open.set(false);
        this.clearSearch();
    }

    removeItem(id: string): void {
        if (this.disabled()) return;
        this.setSelection(this.selectedIds().filter(selected => selected !== id));
    }

    clearAll(): void {
        if (this.disabled()) return;
        this.setSelection([]);
    }
}
