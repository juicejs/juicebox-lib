import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SHARED_IMPORTS } from './shared-imports';

/**
 * @deprecated Use `SHARED_IMPORTS` in a standalone component's `imports`. Kept for project code that imports
 * `SharedModule`: it exports what it always did, SHARED_IMPORTS plus CommonModule (`*ngIf`, `| async`, `| date`, …).
 * The lib itself does not use it.
 */
@NgModule({
    imports: [...SHARED_IMPORTS, CommonModule],
    exports: [...SHARED_IMPORTS, CommonModule]
})
export class SharedModule {}
