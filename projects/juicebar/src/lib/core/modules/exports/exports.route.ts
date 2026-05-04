import { Routes } from '@angular/router';

export const ExportsRoute: Routes = [{
    path: 'exports',
    loadComponent: () => import('./exports.component').then(m => m.ExportsComponent),
    children: [
        {
            path: '',
            loadComponent: () => import('./export-template-listing/export-template-listing.component').then(m => m.ExportTemplateListingComponent),
        },
        {
            path: 'create',
            loadComponent: () => import('./export-template-create/export-template-create.component').then(m => m.ExportTemplateCreateComponent),
        },
        {
            path: 'edit/:id',
            loadComponent: () => import('./export-template-edit/export-template-edit.component').then(m => m.ExportTemplateEditComponent),
        },
    ],
}];
