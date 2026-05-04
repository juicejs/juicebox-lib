import {ChangeDetectionStrategy, Component, effect, inject, input, OnDestroy, output} from '@angular/core';
import {FormControl, FormGroup, ValidatorFn} from '@angular/forms';
import {Subscription} from 'rxjs';
import {ExportValidators} from '../../shared/ExportValidators';
import {AutoLanguagePipe, MultiLanguageObject} from '../../../../shared/pipes/auto-language.pipe';
import {ExportFilter} from '../../types/ExportFilter';
import {ExportStrategy} from '../../types/ExportStrategy';
import {CustomMaterialDateAdapter} from '../../../../shared/services/CustomDatepickerI18n';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';

@Component({
    selector: 'app-export-filters',
    templateUrl: './export-filters.component.html',
    styleUrls: ['./export-filters.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportFiltersComponent implements OnDestroy {

    private juicebox = inject(JuiceboxService);

    filters = input<Array<ExportFilter>>([]);
    disabled = input<boolean>(false);
    selectedDataSourceKey = input<ExportStrategy>();
    filtersValueChange = output<FormGroup>();

    filterForm = new FormGroup({});
    sub = new Subscription();

    private autoLanguage = new AutoLanguagePipe(this.juicebox);

    constructor() {
        effect(() => {
            this.filters();
            this.generateForm();
            this.filtersValueChange.emit(this.filterForm);
        });

        effect(() => {
            const disabled = this.disabled();
            if (disabled) {
                this.filterForm.disable();
            } else {
                this.filterForm.enable();
            }
        });
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }

    private generateForm() {
        const filters = this.filters();
        if (!filters.length) {
            return;
        }
        const controls = {};
        filters.forEach(filter => controls[filter.id] = this.createFilterControl(filter));
        this.filterForm = new FormGroup(controls);
        if (this.disabled()) {
            this.filterForm.disable();
        }

        this.sub.unsubscribe();
        this.sub = this.filterForm.valueChanges.subscribe(() => {
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

            this.filtersValueChange.emit(convertedForm);
        });
    }

    getFilterLabel(filter: ExportFilter) {
        const isRequired = !!filter.validators?.some(validator => validator.key === 'required');
        const suffix = isRequired ? '*' : '';
        return `${this.autoLanguage.transform(filter.label)}${suffix}`;
    }

    getFilterError(filter: ExportFilter) {
        const control = this.filterForm.get(filter.id);
        if (!control || !control.touched) {
            return null;
        }
        const errors = control.errors;
        if (!errors) {
            return null;
        }
        const errorMessage = [] as Array<string>;
        for (const key in errors) {
            const validator = filter.validators.find(validator => validator.key.toLowerCase() === key.toLowerCase());
            if (validator) {
                errorMessage.push(this.autoLanguage.transform(validator.errorMessage));
            }
        }
        return errorMessage.join(' ');
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
            if (dateValue) {
                initialValue = dateValue;
            }
        }

        return new FormControl(initialValue, {
            validators,
        });
    }

}
