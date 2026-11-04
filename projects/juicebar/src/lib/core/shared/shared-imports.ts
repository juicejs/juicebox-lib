/**
 * SHARED IMPORTS - What most lib components import: the forms modules, the app-* UI components, CDK modules
 * and the shared directives, pipes and listing components. Use it in a standalone component's `imports`.
 *
 * TABLE COLUMN WIDTH UTILITIES:
 * Available CSS classes for consistent table column sizing across all modules:
 *
 * Fixed Width Classes:
 * - .col-width-60, .col-width-80, .col-width-100, .col-width-120, etc.
 *
 * Special Purpose Classes:
 * - .col-width-status (60px, centered) - for active/inactive status columns
 * - .col-width-actions (100px, centered) - for action button columns
 * - .col-width-count (80px, centered) - for count/number columns
 * - .col-width-icon (50px, centered) - for icon-only columns
 *
 * Flexible Classes:
 * - .col-width-flex-1, .col-width-flex-2, .col-width-flex-3
 */

import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DialogModule } from '@angular/cdk/dialog';
import { CdkTableModule } from '@angular/cdk/table';
import { CdkMenuModule } from '@angular/cdk/menu';
import { OverlayModule } from '@angular/cdk/overlay';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkListboxModule } from '@angular/cdk/listbox';
import {
  ButtonComponent,
  CardComponent, CardHeaderComponent, CardTitleComponent, CardContentComponent, CardActionsComponent, CardFooterComponent,
  FormFieldComponent, LabelComponent, ErrorComponent,
  InputDirective,
  SelectComponent, OptionComponent,
  CheckboxComponent,
  IconComponent,
  DialogTitleComponent, DialogContentComponent, DialogActionsComponent,
  TooltipDirective, TooltipComponent,
  ToolbarComponent,
  SidenavComponent, SidenavContainerComponent,
  NavListComponent, ListItemComponent,
  DividerComponent,
  ProgressSpinnerComponent,
  SlideToggleComponent,
  PaginatorComponent,
  TabsComponent, TabComponent,
  SnackbarComponent,
  DatepickerComponent,
  AutocompleteComponent
} from '../../ui-components';
import { PromiseButtonDirective } from './directives/PromiseButton';
import { HasPermissionDirective } from './directives/HasPermissionDirective';
import { HasPermissionHideDirective } from './directives/HasPermissionHideDirective';
import { NoPermissionDisableDirective } from './directives/no-permission-disable.directive';
import { NgSelectDebounceDirective } from './directives/debounce/ng-select-debounce.directive';
import { DebounceKeyupDirective } from './directives/debounce/debounce-keyup.directive';
import { ConfirmationDialogComponent } from './components/confirmation-dialog/confirmation-dialog.component';
import { SharedTranslationPipe } from './i18n/shared-translation.pipe';
import { ListingComponent } from './components/listing/listing.component';
import { FilterContainerComponent } from './components/filter-container/filter-container.component';
import { PageSizeSelectorComponent } from './components/page-size-selector/page-size-selector.component';
import { FilterBarComponent } from './components/filter-bar/filter-bar.component';
import { TimeAgoPipe } from './pipes/time-ago.pipe';

export const SHARED_IMPORTS = [
  HasPermissionDirective,
  ConfirmationDialogComponent,
  SharedTranslationPipe,
  HasPermissionHideDirective,
  PromiseButtonDirective,
  NgSelectDebounceDirective,
  DebounceKeyupDirective,
  PageSizeSelectorComponent,
  TimeAgoPipe,
  ReactiveFormsModule,
  FormsModule,
  // UI components
  ButtonComponent,
  CardComponent, CardHeaderComponent, CardTitleComponent, CardContentComponent, CardActionsComponent, CardFooterComponent,
  FormFieldComponent, LabelComponent, ErrorComponent,
  InputDirective,
  SelectComponent, OptionComponent,
  CheckboxComponent,
  IconComponent,
  DialogModule, DialogTitleComponent, DialogContentComponent, DialogActionsComponent,
  CdkTableModule,
  CdkMenuModule,
  TooltipDirective, TooltipComponent, OverlayModule,
  ToolbarComponent,
  SidenavComponent, SidenavContainerComponent,
  NavListComponent, ListItemComponent,
  DividerComponent,
  ProgressSpinnerComponent,
  SlideToggleComponent,
  PaginatorComponent,
  TabsComponent, TabComponent,
  SnackbarComponent,
  DragDropModule,
  CdkListboxModule,
  ListingComponent,
  FilterContainerComponent,
  FilterBarComponent,
  NoPermissionDisableDirective,
  DatepickerComponent,
  AutocompleteComponent
] as const;
