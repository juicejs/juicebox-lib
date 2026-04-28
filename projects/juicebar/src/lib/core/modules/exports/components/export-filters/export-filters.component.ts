import {Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges} from '@angular/core';
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
    styleUrls: ['./export-filters.component.scss']
})
export class ExportFiltersComponent implements OnChanges, OnDestroy {

    @Input() filters: Array<ExportFilter> = [];
    @Input() disabled: boolean = false;
    @Input() selectedDataSourceKey: ExportStrategy;
    @Output() filtersValueChange: EventEmitter<FormGroup> = new EventEmitter();

    filterForm = new FormGroup({});
    sub = new Subscription();

    private autoLanguage: AutoLanguagePipe;

    constructor(private juicebox: JuiceboxService) {
        this.autoLanguage = new AutoLanguagePipe(this.juicebox);
    }

    ngOnChanges(changes: SimpleChanges) {
        console.log(changes["filters"]);
        if (changes["filters"]) {
            this.generateForm();
            this.filtersValueChange.emit(this.filterForm);
        }
        if (changes["disabled"]) {
            if (changes["disabled"].currentValue === true) {
                this.filterForm.disable();
            }
            if (changes["disabled"].currentValue === false) {
                this.filterForm.enable();
            }
        }
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }

    private generateForm() {
        if (!this.filters.length) {
            return;
        }
        const controls = {};
        this.filters.forEach(filter => controls[filter.id] = this.createFilterControl(filter));
        this.filterForm = new FormGroup(controls);
        if (this.disabled) {
            this.filterForm.disable();
        }

        this.sub = this.filterForm.valueChanges.subscribe(() => {
            // Convert Date objects back to {year, month, day} format for backend
            const formValue = this.filterForm.value;
            const convertedForm = new FormGroup({});
            
            Object.keys(formValue).forEach(key => {
                const filter = this.filters.find(f => f.id === key);
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

    /**
     * Get the label for a filter, using the autoLanguage pipe to translate it
     * and adding a '*' if the filter is required.
     */
    getFilterLabel(filter: ExportFilter) {
        const isRequired = !!filter.validators?.some(validator => validator.key === 'required');
        const suffix = isRequired ? '*' : '';
        return `${this.autoLanguage.transform(filter.label)}${suffix}`;
    }

    /**
     * Get all the error messages for a filter if Angular validation is reporting errors.
     * The error message is translated using the autoLanguage pipe.
     */
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
            // toLowerCase() is used because the error key is sometimes different from the validator key
            // example: 'maxLength' validator has error key 'maxlength'
            const validator = filter.validators.find(validator => validator.key.toLowerCase() === key.toLowerCase());
            if (validator) {
                errorMessage.push(this.autoLanguage.transform(validator.errorMessage));
            }
        }
        return errorMessage.join(' ');
    }

    /**
     * Create a form control for a filter with the appropriate validators.
     * If `methodArgs` the validator is a function that requires arguments, they are passed to the validator.
     * If `methodArgs` is not present, the validator function is not called
     * @example
     * // Required validator doesn't need arguments
     * { key: 'required' } -> ExportValidators.required
     * // MaxLength validator needs an argument
     * { key: 'maxLength', methodArgs: [10] } -> ExportValidators.maxLength(10)
     */
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

        // Convert date strings to Date objects for Material DatePicker
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
