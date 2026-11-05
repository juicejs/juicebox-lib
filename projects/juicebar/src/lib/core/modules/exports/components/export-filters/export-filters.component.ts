import {ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, Pipe, PipeTransform, signal, untracked} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn} from '@angular/forms';
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
    changeDetection: ChangeDetectionStrategy.OnPush,
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

    filters = input<Array<ExportFilter>>([]);
    disabled = input<boolean>(false);
    selectedDataSourceKey = input<ExportStrategy>();
    /**
     * The filter form itself, on every change (as in the old admin), so its `valid` and `dirty` are the real ones.
     * Read its values with `exportFilterValues()`, which gives dates in the stored `{year, month, day}` shape.
     */
    filtersValueChange = output<FormGroup>();

    filterForm = new FormGroup<Record<string, AbstractControl>>({});
    readonly filterFormTick = signal(0);

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
