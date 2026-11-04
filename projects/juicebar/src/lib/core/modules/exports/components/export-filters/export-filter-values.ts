import {FormGroup} from '@angular/forms';
import {CustomMaterialDateAdapter} from '../../../../shared/services/CustomDatepickerI18n';

/**
 * The filter form's values as they are stored on the export template: dates as `{year, month, day}`,
 * the shape the old ngb datepicker gave them. `app-datepicker` holds a `Date`.
 */
export function exportFilterValues(filterForm: FormGroup): Record<string, unknown> {
    const values: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(filterForm.value as Record<string, unknown>)) {
        values[key] = value instanceof Date ? CustomMaterialDateAdapter.formatAppDateObjectValue(value) : value;
    }
    return values;
}
