import { InjectionToken } from '@angular/core';

/**
 * Lets a directive on the same element (e.g. `[hasPermissions]`) disable an app-* control.
 * A `disabled` attribute set from outside would be overwritten by the control's own `[disabled]` binding.
 */
export interface Disableable {
  setExternallyDisabled(disabled: boolean): void;
}

export const DISABLEABLE = new InjectionToken<Disableable>('DISABLEABLE');
