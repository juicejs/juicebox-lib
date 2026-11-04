import { NgModule } from '@angular/core';
import { AutoLanguageComponent } from './auto-language.component';

/**
 * @deprecated Import `AutoLanguageComponent`. Kept for project code that imports `AutoLanguageModule`, which exports
 * only that component. The lib itself does not use it.
 */
@NgModule({
    imports: [AutoLanguageComponent],
    exports: [AutoLanguageComponent]
})
export class AutoLanguageModule {}
