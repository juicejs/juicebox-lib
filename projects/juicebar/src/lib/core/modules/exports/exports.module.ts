import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SharedModule} from '../../shared/shared.module';
import {RouterModule} from "@angular/router";
import {ExportsComponent} from './exports.component';
import {ExportsTranslationPipe} from "./i18n/exports.translation";
import {ExportTemplateListingComponent} from './export-template-listing/export-template-listing.component';
import {ExportTemplateCreateComponent} from "./export-template-create/export-template-create.component";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {DragulaModule} from "ng2-dragula";
// import {ExportPreviewComponent} from './export-preview/export-preview.component';
import {ExportFiltersComponent} from './components/export-filters/export-filters.component';
import {ExportTemplateEditComponent} from './export-template-edit/export-template-edit.component';
import {ExcelExportConfirmComponent} from './export-confirm/excel-confirm/excel-export-confirm.component';
import {PdfExportConfirmComponent} from './export-confirm/pdf-confirm/pdf-export-confirm.component';
import {AutoLanguagePipe} from '../../shared/pipes/auto-language.pipe';
import {AsyncMultiselectComponent} from './components/async-multiselect/async-multiselect.component';

@NgModule({
    declarations: [
        ExportTemplateListingComponent,
        ExportTemplateEditComponent,
        ExportTemplateCreateComponent,
        ExportsTranslationPipe,
        ExportsComponent,
        // ExportPreviewComponent,
        ExportFiltersComponent,
        ExcelExportConfirmComponent,
        PdfExportConfirmComponent,
        AsyncMultiselectComponent,
    ],
  imports: [
    RouterModule,
    CommonModule,
    SharedModule,
    ReactiveFormsModule,
    DragulaModule,
    FormsModule,
    AutoLanguagePipe
  ],
    exports: [
        RouterModule
    ],
    providers: [
        ExportsTranslationPipe
    ]
})
export class ExportsModule {
    constructor() {}
}

