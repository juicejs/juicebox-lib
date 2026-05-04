/**
 * SHARED MODULE - Contains reusable components, directives, and utilities
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
 *
 * Usage Example:
 * <mat-header-cell class="col-width-status">Status</mat-header-cell>
 * <mat-cell class="col-width-status">...</mat-cell>
 */

import {importProvidersFrom, NgModule} from '@angular/core';
import { MaterialPromiseButtonDirective} from './directives/MaterialPromiseButton';
import { HasPermissionDirective} from './directives/HasPermissionDirective';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ConfirmationDialogComponent} from './components/confirmation-dialog/confirmation-dialog.component';
import { CommonModule } from '@angular/common';
import { AutoLanguageModule} from './auto-language/auto-language.module';

// Import new UI components
import {
  ButtonComponent,
  CardComponent, CardHeaderComponent, CardTitleComponent, CardContentComponent, CardActionsComponent, CardFooterComponent,
  FormFieldComponent, LabelComponent, ErrorComponent,
  InputDirective,
  SelectComponent, OptionComponent,
  CheckboxComponent,
  IconComponent,
  DialogService, DialogTitleComponent, DialogContentComponent, DialogActionsComponent,
  MenuComponent, MenuItemComponent, MenuTriggerComponent,
  TooltipDirective, TooltipComponent,
  ToolbarComponent,
  SidenavComponent, SidenavContainerComponent,
  NavListComponent, ListItemComponent,
  DividerComponent,
  ProgressSpinnerComponent,
  SlideToggleComponent,
  PaginatorComponent,
  TabsComponent, TabComponent,
  SnackbarService, SnackbarComponent,
  DatepickerComponent,
  AutocompleteComponent
} from '../../ui-components';

// Import CDK modules directly to avoid build path resolution issues
import { DialogModule } from '@angular/cdk/dialog';
import { CdkTableModule } from '@angular/cdk/table';
import { CdkMenuModule } from '@angular/cdk/menu';
import { OverlayModule } from '@angular/cdk/overlay';
import { DragDropModule } from '@angular/cdk/drag-drop';
// import { ProgressBarsComponent } from './shared/progress-bars/progress-bars.component';
// import { JuicechainAuthComponent } from './shared/juicechain-auth/juicechain-auth.component';
// import { ProgressbarModule } from './shared/progressbar/progressbar.module';
// import { Angular2PromiseButtonModule } from 'angular2-promise-buttons';
import { HasPermissionHideDirective} from './directives/HasPermissionHideDirective';
// import { PageNotFoundComponent } from './shared/page-not-found/page-not-found.component';
// import { QRDialogComponent } from './shared/juicechain-auth/qrdialog/qr-dialog.modal';
// import { QRCodeModule } from 'angularx-qrcode';
// import { SwitchFilterComponent } from './shared/switch-filter/switch-filter.component';
// import { TimeProgressBarComponent } from './shared/time-progress-bar/time-progress-bar.component';
// import { UiSwitchModule } from 'ngx-ui-switch';
// import { KeepHtmlPipe } from '../pipes/keep-html.pipe';
// import { AutoLanguagePipe} from './pipes/auto-language.pipe';
// import { NoPermissionDisableDirective } from '../directives/no-permission-disable.directive';
// import { FilterContainerComponent } from './shared/filter-container/filter-container.component';
// import { NumberConversionPipe } from '../pipes/NumberConversionPipe';
// import { AngularEditorModule } from '@kolkov/angular-editor';
// import { DigitOnlyDirective } from '../directives/digit-only.directive';
// import { TimeInputComponent } from './shared/time-input/time-input.component';
import { DragulaModule } from 'ng2-dragula';
import { SharedTranslationPipe} from './i18n/shared-translation.pipe';
import {NgSelectDebounceDirective} from './directives/debounce/ng-select-debounce.directive';
import {DebounceKeyupDirective} from './directives/debounce/debounce-keyup.directive';
import {ListingComponent} from './components/listing/listing.component';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {FilterContainerComponent} from './components/filter-container/filter-container.component';
import {PageSizeSelectorComponent} from './components/page-size-selector/page-size-selector.component';
import {TimeAgoPipe} from './pipes/time-ago.pipe';
import {NoPermissionDisableDirective} from './directives/no-permission-disable.directive';
import {FilterBarComponent} from './components/filter-bar/filter-bar.component';
import { CdkListboxModule } from '@angular/cdk/listbox';
@NgModule({
    declarations: [
        // Moved to imports - standalone is default in Angular v20+
        // MaterialPromiseButtonDirective,
        // HasChannelAccessDirective,
        // HasPermissionDirective,
        // ConfirmationDialogComponent,
        // SharedTranslationPipe,
        // ProgressBarsComponent,
        // JuicechainAuthComponent,
        // HasPermissionHideDirective,
      // NgSelectDebounceDirective,
      // DebounceKeyupDirective,
      // ListingComponent,
      // FilterContainerComponent,
      // PageSizeSelectorComponent,
      // TimeAgoPipe,
      // FilterBarComponent,
        // ShowWithPermissionsDirective,
        // QRDialogComponent,
        // PageNotFoundComponent,
        // SwitchFilterComponent,
        // KeepHtmlPipe,
        // AutoLanguagePipe,
        // NumberConversionPipe,
        // NoPermissionDisableDirective,
        // FilterContainerComponent,
        // DigitOnlyDirective,
        // TimeInputComponent,
        // ArrayMapPipe,
        // TimeAgoPipe,
        // DatetimepickerComponent,
        // PageSizeSelectorComponent,
        // DateAndTimePickerComponent,
        // DebounceKeyupDirective,
        // NgSelectDebounceDirective,
        // Wizard,
        // StepHostDirective,
        // GaugeComponent,
        // InfiniteScrollComponent,
        // BarPlotComponent,
        // TimeProgressBarComponent
    ],
  exports: [
    HasPermissionDirective,
    ConfirmationDialogComponent,
    SharedTranslationPipe,
    HasPermissionHideDirective,
    MaterialPromiseButtonDirective,
    NgSelectDebounceDirective,
    DebounceKeyupDirective,
    PageSizeSelectorComponent,
    TimeAgoPipe,
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    // New UI Components
    ButtonComponent,
    CardComponent, CardHeaderComponent, CardTitleComponent, CardContentComponent, CardActionsComponent, CardFooterComponent,
    FormFieldComponent, LabelComponent, ErrorComponent,
    InputDirective,
    SelectComponent, OptionComponent,
    CheckboxComponent,
    IconComponent,
    DialogModule, DialogTitleComponent, DialogContentComponent, DialogActionsComponent,
    CdkTableModule,
    CdkMenuModule, MenuComponent, MenuItemComponent, MenuTriggerComponent,
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
  ],
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    AutoLanguageModule,
    DragulaModule.forRoot(),
    // New UI Components
    ButtonComponent,
    CardComponent, CardHeaderComponent, CardTitleComponent, CardContentComponent, CardActionsComponent, CardFooterComponent,
    FormFieldComponent, LabelComponent, ErrorComponent,
    InputDirective,
    SelectComponent, OptionComponent,
    CheckboxComponent,
    IconComponent,
    DialogModule, DialogTitleComponent, DialogContentComponent, DialogActionsComponent,
    CdkTableModule,
    CdkMenuModule, MenuComponent, MenuItemComponent, MenuTriggerComponent,
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
    RouterLink,
    RouterLinkActive,
    // Standalone components, directives, and pipes (default in Angular v20+)
    MaterialPromiseButtonDirective,
    HasPermissionDirective,
    ConfirmationDialogComponent,
    SharedTranslationPipe,
    HasPermissionHideDirective,
    NgSelectDebounceDirective,
    DebounceKeyupDirective,
    ListingComponent,
    FilterContainerComponent,
    PageSizeSelectorComponent,
    TimeAgoPipe,
    FilterBarComponent,
    NoPermissionDisableDirective,
    DatepickerComponent,
    AutocompleteComponent
  ],
  providers: [
    DialogService,
    SnackbarService,
    importProvidersFrom(
      DialogModule,
      OverlayModule,
      CdkTableModule,
      CdkMenuModule,
      CdkListboxModule,
      DragDropModule
    )
  ]
})
export class SharedModule{}
