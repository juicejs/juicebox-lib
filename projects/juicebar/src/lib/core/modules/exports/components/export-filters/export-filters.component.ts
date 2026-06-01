import {ChangeDetectionStrategy, Component, effect, inject, input, OnDestroy, output, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormControl, FormGroup, ReactiveFormsModule, ValidatorFn} from '@angular/forms';
import {Subscription} from 'rxjs';
import {ExportValidators} from '../../shared/ExportValidators';
import {AutoLanguagePipe, MultiLanguageObject} from '../../../../shared/pipes/auto-language.pipe';
import {ExportFilter} from '../../types/ExportFilter';
import {ExportStrategy} from '../../types/ExportStrategy';
import {CustomMaterialDateAdapter} from '../../../../shared/services/CustomDatepickerI18n';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {SharedModule} from '../../../../shared/shared.module';
import {ExportsTranslationPipe} from '../../i18n/exports.translation';
import {AsyncMultiselectComponent} from '../async-multiselect/async-multiselect.component';

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
    ]
})
export class ExportFiltersComponent implements OnDestroy {

    private juicebox = inject(JuiceboxService);

    filters = input<Array<ExportFilter>>([]);
    disabled = input<boolean>(false);
    selectedDataSourceKey = input<ExportStrategy>();
    filtersValueChange = output<FormGroup>();

    filterForm = new FormGroup({});
    sub = new Subscription();

    readonly filterSearches = signal<Record<string, string>>({});
    readonly formTick = signal(0);

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
        this.filterSearches.set({});
        this.formTick.update(v => v + 1);
        if (this.disabled()) {
            this.filterForm.disable();
        }

        this.sub.unsubscribe();
        this.sub = this.filterForm.valueChanges.subscribe(() => {
            this.formTick.update(v => v + 1);
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

    onFilterSearch(filterId: string, event: Event) {
        const value = (event.target as HTMLInputElement).value;
        this.filterSearches.update(prev => ({...prev, [filterId]: value}));
    }

    getSearch(filterId: string): string {
        return this.filterSearches()[filterId] ?? '';
    }

    getFilteredItems(filter: ExportFilter): { id: string, label: any }[] {
        const search = this.getSearch(filter.id).trim().toLowerCase();
        const items = filter.items ?? [];
        if (!search) return items;
        return items.filter(item => {
            const label = (this.autoLanguage.transform(item.label) ?? '').toString().toLowerCase();
            return label.includes(search);
        });
    }

    isMultiSelected(filterId: string, itemId: string): boolean {
        this.formTick();
        const value = this.filterForm.get(filterId)?.value;
        return Array.isArray(value) && value.includes(itemId);
    }

    toggleMultiSelect(filterId: string, itemId: string) {
        const control = this.filterForm.get(filterId);
        if (!control) return;
        const current: string[] = Array.isArray(control.value) ? [...control.value] : [];
        const idx = current.indexOf(itemId);
        if (idx === -1) current.push(itemId);
        else current.splice(idx, 1);
        control.markAsTouched();
        control.setValue(current.length ? current : null);
    }

    clearMultiSelect(filter: ExportFilter, event: Event) {
        event.stopPropagation();
        const control = this.filterForm.get(filter.id);
        if (!control) return;
        control.markAsTouched();
        control.setValue(null);
    }

    getMultiSelectLabel(filter: ExportFilter): string {
        this.formTick();
        const value = this.filterForm.get(filter.id)?.value;
        if (!Array.isArray(value) || !value.length) return '';
        const items = filter.items ?? [];
        if (value.length === 1) {
            const item = items.find(i => i.id === value[0]);
            return item ? this.autoLanguage.transform(item.label) : `${value.length} selected`;
        }
        return `${value.length} selected`;
    }

    getSelectLabel(filter: ExportFilter): string {
        this.formTick();
        const value = this.filterForm.get(filter.id)?.value;
        if (value == null || value === '') return '';
        const item = (filter.items ?? []).find(i => i.id === value);
        return item ? this.autoLanguage.transform(item.label) : '';
    }

    selectSingle(filterId: string, itemId: string | null) {
        const control = this.filterForm.get(filterId);
        if (!control) return;
        control.markAsTouched();
        control.setValue(itemId);
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
