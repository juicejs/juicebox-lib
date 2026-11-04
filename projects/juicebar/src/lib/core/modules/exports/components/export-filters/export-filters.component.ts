import {ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, signal, untracked} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormControl, FormGroup, ReactiveFormsModule, ValidatorFn} from '@angular/forms';
import {ExportValidators} from '../../shared/ExportValidators';
import {AutoLanguagePipe} from '../../../../shared/pipes/auto-language.pipe';
import {ExportFilter} from '../../types/ExportFilter';
import {ExportStrategy} from '../../types/ExportStrategy';
import {CustomMaterialDateAdapter} from '../../../../shared/services/CustomDatepickerI18n';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {SHARED_IMPORTS} from '../../../../shared/shared-imports';
import {ExportsTranslationPipe} from '../../i18n/exports.translation';
import {AsyncMultiselectComponent} from '../async-multiselect/async-multiselect.component';
import {FilterLabelPipe} from '../../pipes/filter-label.pipe';

@Component({
    selector: 'app-export-filters',
    templateUrl: './export-filters.component.html',
    styleUrls: ['./export-filters.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    ReactiveFormsModule,
    SHARED_IMPORTS,
    AutoLanguagePipe,
    ExportsTranslationPipe,
    AsyncMultiselectComponent,
    FilterLabelPipe
]
})
export class ExportFiltersComponent {

    private juicebox = inject(JuiceboxService);
    private destroyRef = inject(DestroyRef);

    filters = input<Array<ExportFilter>>([]);
    disabled = input<boolean>(false);
    selectedDataSourceKey = input<ExportStrategy>();
    /**
     * The filter form itself, on every change (as in the old admin), so its `valid` and `dirty` are the real ones.
     * Read its values with `exportFilterValues()`, which gives dates in the stored `{year, month, day}` shape.
     */
    filtersValueChange = output<FormGroup>();

    filterForm = new FormGroup({});
    readonly filterFormTick = signal(0);

    private autoLanguage = new AutoLanguagePipe(this.juicebox);

    constructor() {
        // Rebuilt only when the filters change, as in the old admin; `disabled` alone keeps what was typed
        effect(() => {
            this.filters();
            untracked(() => {
                this.generateForm();
                this.filtersValueChange.emit(this.filterForm);
            });
        });

        effect(() => {
            if (this.disabled()) {
                this.filterForm.disable();
            } else {
                this.filterForm.enable();
            }
        });
    }

    private generateForm() {
        const filters = this.filters();
        if (!filters.length) return;

        const controls = {};
        filters.forEach(filter => controls[filter.id] = this.createFilterControl(filter));
        this.filterForm = new FormGroup(controls);
        if (this.disabled()) this.filterForm.disable();

        const form = this.filterForm;
        form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.filterFormTick.update(v => v + 1);
            this.filtersValueChange.emit(form);
        });
    }

    getFilterError(filter: ExportFilter): string | null {
        this.filterFormTick();
        const control = this.filterForm.get(filter.id);
        if (!control?.touched || !control.errors) return null;

        const errorMessage: string[] = [];
        for (const key in control.errors) {
            const validator = filter.validators?.find(v => v.key.toLowerCase() === key.toLowerCase());
            if (validator) errorMessage.push(this.autoLanguage.transform(validator.errorMessage));
        }
        return errorMessage.join(' ') || null;
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

        let initialValue = filter.value;
        if (filter.type === 'date' && filter.value) {
            const dateValue = CustomMaterialDateAdapter.parseAppDateValue(filter.value);
            if (dateValue) initialValue = dateValue;
        }

        return new FormControl(initialValue, { validators });
    }
}
