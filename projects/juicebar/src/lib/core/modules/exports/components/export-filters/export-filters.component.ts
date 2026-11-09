import {Component, computed, DestroyRef, effect, inject, input, output, Pipe, PipeTransform, signal, untracked} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn} from '@angular/forms';
import {ExportValidators} from '../../shared/ExportValidators';
import {AutoLanguagePipe} from '../../../../shared/pipes/auto-language.pipe';
import {ExportFilter} from '../../types/ExportFilter';
import {ExportStrategy} from '../../types/ExportStrategy';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {SHARED_IMPORTS} from '../../../../shared/shared-imports';
import {ExportsTranslationPipe} from '../../i18n/exports.translation';
import {AsyncMultiselectComponent} from '../async-multiselect/async-multiselect.component';
import {FilterLabelPipe} from '../../pipes/filter-label.pipe';
import {hiddenFilterIds, injectExportsOptions} from '../../exports-shared';

/**
 * A filter's error text: the messages of its validators whose errors are set. The input is the control's errors once
 * it was touched (otherwise nothing); `tick` re-runs it on every value change of the filter form.
 */
@Pipe({name: 'exportFilterError'})
export class ExportFilterErrorPipe implements PipeTransform {
    private autoLanguage = new AutoLanguagePipe(inject(JuiceboxService));

    transform(errors: ValidationErrors | null | false, filter: ExportFilter, tick?: number): string | null {
        if (!errors) return null;

        const errorMessage: string[] = [];
        for (const key in errors) {
            const validator = filter.validators?.find(v => v.key.toLowerCase() === key.toLowerCase());
            if (validator) errorMessage.push(this.autoLanguage.transform(validator.errorMessage));
        }
        return errorMessage.join(' ') || null;
    }
}

@Component({
    selector: 'app-export-filters',
    templateUrl: './export-filters.component.html',
    styleUrls: ['./export-filters.component.scss'],
    imports: [
    ReactiveFormsModule,
    SHARED_IMPORTS,
    AutoLanguagePipe,
    ExportsTranslationPipe,
    AsyncMultiselectComponent,
    FilterLabelPipe,
    ExportFilterErrorPipe
]
})
export class ExportFiltersComponent {

    private destroyRef = inject(DestroyRef);
    /** Filters this user doesn't see (ExportsOptions.hiddenFilters), as QC hides `show_modules` from mine-only users */
    private readonly hidden = hiddenFilterIds(injectExportsOptions(), inject(JuiceboxService));

    filters = input<Array<ExportFilter>>([]);
    disabled = input<boolean>(false);
    selectedDataSourceKey = input<ExportStrategy>();
    /**
     * The filter form itself, on every change (as in the old admin), so its `valid` and `dirty` are the real ones.
     * Read its values with `exportFilterValues()`, which gives dates in the stored `{year, month, day}` shape.
     */
    filtersValueChange = output<FormGroup>();

    /** Rebuilt for other filters; a hidden filter keeps its control and value */
    readonly filterForm = signal(new FormGroup<Record<string, AbstractControl>>({}));
    readonly filterFormTick = signal(0);
    protected readonly visibleFilters = computed(() => this.filters().filter(filter => !this.hidden.has(filter.id)));

    constructor() {
        // Rebuilt only when the filters change, as in the old admin; `disabled` alone keeps what was typed
        effect(() => {
            const filters = this.filters();
            untracked(() => {
                const form = this.generateForm(filters);
                this.filterForm.set(form);
                this.filtersValueChange.emit(form);
            });
        });

        effect(() => {
            const form = this.filterForm();
            if (this.disabled()) {
                form.disable();
            } else {
                form.enable();
            }
        });
    }

    /** Also for no filters: a data source without them must not keep the previous one's values */
    private generateForm(filters: ExportFilter[]): FormGroup<Record<string, AbstractControl>> {
        const controls: Record<string, AbstractControl> = {};
        filters.forEach(filter => controls[filter.id] = this.createFilterControl(filter));
        const form = new FormGroup(controls);
        if (this.disabled()) form.disable();

        form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.filterFormTick.update(v => v + 1);
            this.filtersValueChange.emit(form);
        });
        return form;
    }

    private createFilterControl(filter: ExportFilter) {
        const validators = filter.validators
            ?.filter(validator => {
                if (!ExportValidators?.[validator.key]) {
                    console.warn(`${filter.id}: Validator ${validator.key} does not exist`);
                    return false;
                }
                return true;
            })
            .map(validator => validator.methodArgs?.length
                ? (ExportValidators[validator.key] as (...args: any[]) => void)(...validator.methodArgs)
                : ExportValidators[validator.key]
            ) as Array<ValidatorFn>;

        // As in the old admin: the stored value as it is; app-datepicker reads and gives dates as `{year, month, day}`
        return new FormControl(filter.value, { validators });
    }
}
