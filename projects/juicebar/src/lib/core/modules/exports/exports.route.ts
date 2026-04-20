import {Routes} from '@angular/router';
import {ExportsComponent} from './exports.component';
import {ExportTemplateListingComponent} from './export-template-listing/export-template-listing.component';
import {ExportTemplateCreateComponent} from './export-template-create/export-template-create.component';
import {ExportTemplateEditComponent} from './export-template-edit/export-template-edit.component';

export const ExportsRoute: Routes = [{
  path: 'exports',
  component: ExportsComponent,
  children: [
    {
      path: '',
      component: ExportTemplateListingComponent
    },
    {
      path: 'create',
      component: ExportTemplateCreateComponent
    },
    {
      path: 'edit/:id',
      component: ExportTemplateEditComponent,
    }
  ]
}];
