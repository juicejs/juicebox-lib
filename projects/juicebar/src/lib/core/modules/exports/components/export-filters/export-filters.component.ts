import {ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {CommonModule} from '@angular/common';
import {FormControl, FormGroup, ReactiveFormsModule, ValidatorFn} from '@angular/forms';
import {ExportValidators} from '../../shared/ExportValidators';
import {AutoLanguagePipe} from '../../../../shared/pipes/auto-language.pipe';
import {ExportFilter} from '../../types/ExportFilter';
import {ExportStrategy} from '../../types/ExportStrategy';
import {CustomMaterialDateAdapter} from '../../../../shared/services/CustomDatepickerI18n';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {SharedModule} from '../../../../shared/shared.module';
import {ExportsTranslationPipe} from '../../i18n/exports.translation';
import {AsyncMultiselectComponent} from '../async-multiselect/async-multiselect.component';
import {FilterLabelPipe} from '../../pipes/filter-label.pipe';

@Component({
    selector: 'app-export-filters',
    templateUrl: './export-filters.component.html',
    styleUrls: ['./export-filters.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        SharedModule,
        AutoLanguagePipe,
        ExportsTranslationPipe,
        AsyncMultiselectComponent,
        FilterLabelPipe,
    ]
})
export class ExportFiltersComponent {

    private juicebox = inject(JuiceboxService);
    private destroyRef = inject(DestroyRef);

    filters = input<Array<ExportFilter>>([]);
    disabled = input<boolean>(false);
    selectedDataSourceKey = input<ExportStrategy>();
    filtersValueChange = output<FormGroup>();

    filterForm = new FormGroup({});
    readonly filterFormTick = signal(0);

    private autoLanguage = new AutoLanguagePipe(this.juicebox);

    constructor() {
        effect(() => {
            this.filters();
            this.generateForm();
            this.filtersValueChange.emit(this.filterForm);
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

        this.filterForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            const formValue = this.filterForm.value;
            const convertedForm = new FormGroup({});

            Object.keys(formValue).forEach(key => {
                const filter = filters.find(f => f.id === key);
                const value = formValue[key];

                if (filter?.type === 'date' && value instanceof Date) {
                    const dateObject = CustomMaterialDateAdapter.formatAppDateObjectValue(value);
                    convertedForm.addControl(key, new FormControl(dateObject));
                } else {
                    convertedForm.addControl(key, new FormControl(value));
                }
            });

            this.filterFormTick.update(v => v + 1);
            this.filtersValueChange.emit(convertedForm);
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
