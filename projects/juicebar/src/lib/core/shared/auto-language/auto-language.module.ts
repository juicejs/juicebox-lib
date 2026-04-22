import {NgModule} from '@angular/core';
import {AutoLanguageComponent} from './auto-language.component';
import {CommonModule} from '@angular/common';

@NgModule({
    declarations: [
        // Moved to imports - standalone is default in Angular v20+
    ],
    imports: [
        CommonModule,
        AutoLanguageComponent
    ],
    exports: [AutoLanguageComponent],
    providers: [],
    bootstrap: []
})
export class AutoLanguageModule {


}
