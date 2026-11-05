import {FormGroup} from '@angular/forms';
import {CustomMaterialDateAdapter} from '../../../../shared/services/CustomDatepickerI18n';

/**
 * The filter form's values as they are stored on the export template: dates as `{year, month, day}`,
 * the shape the old ngb datepicker gave them and app-datepicker gives by default; a `Date` set from code is converted to it.
 * `raw` also includes disabled filters (`getRawValue()`), as the old async multiselect sent them with its options request.
 */
export function exportFilterValues(filterForm: FormGroup, raw = false): Record<string, unknown> {
    const formValue = (raw ? filterForm.getRawValue() : filterForm.value) as Record<string, unknown>;
    const values: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(formValue)) {
        values[key] = value instanceof Date ? CustomMaterialDateAdapter.formatAppDateObjectValue(value) : value;
    }
    return values;
}
