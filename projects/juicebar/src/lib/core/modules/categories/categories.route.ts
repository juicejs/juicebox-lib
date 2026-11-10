import {Routes} from '@angular/router';
import {ComponentOverride} from '../../../config/base-app.config';
import {applyComponentOverrides} from '../../../config/route-customization';
import {unsavedChangesGuard} from '../../shared/guards/unsaved-changes.guard';

/** The old juicebox category routes (`main/categories/...`), so links to them keep working */
export function buildCategoriesRoute(overrides?: ComponentOverride[]): Routes {
  return applyComponentOverrides([{
    path: 'categories',
    children: [
      {
        path: '',
        loadComponent: () => import('./listing/categories-listing.component').then(m => m.CategoriesListingComponent),
        // The compact list next to an open record (the split view)
        data: {listingPane: true},
      },
      {
        path: 'category-wizard',
        loadComponent: () => import('./wizard/category-wizard.component').then(m => m.CategoryWizardComponent),
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: 'details/:id',
        data: {splitView: true},
        loadComponent: () => import('./details/category-details.component').then(m => m.CategoryDetailsComponent),
        children: [
          {path: '', redirectTo: 'details-category', pathMatch: 'full'},
          {
            path: 'details-category',
            loadComponent: () => import('./details/details-category/details-category.component').then(m => m.DetailsCategoryComponent),
            canDeactivate: [unsavedChangesGuard],
          },
          {
            path: 'media-category',
            loadComponent: () => import('./details/category-media/category-media.component').then(m => m.CategoryMediaComponent),
          },
          {
            path: 'included-articles-category',
            loadComponent: () => import('./details/included-articles/included-articles.component').then(m => m.IncludedArticlesComponent),
          },
        ],
      },
    ],
  }], overrides);
}
