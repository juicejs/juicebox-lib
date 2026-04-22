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
import { MatSidenavModule } from '@angular/material/sidenav';
import {MatToolbar, MatToolbarModule} from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import {MatIcon, MatIconModule} from '@angular/material/icon';
import {MatButton, MatButtonModule, MatIconButton} from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { AutoLanguageModule} from './auto-language/auto-language.module';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
// import { ArrayMapPipe } from '../pipes/array-map.pipe';
// import { TimeAgoPipe } from '../pipes/time-ago.pipe';
// import { DatetimepickerComponent } from './shared/datetimepicker/datetimepicker.component';
// import { NgSelectModule } from '@ng-select/ng-select';
// import { PageSizeSelectorComponent } from './shared/page-size-selector/page-size-selector.component';
// import { DateAndTimePickerComponent } from './shared/date-and-time-picker/date-and-time-picker.component';
// import { DebounceKeyupDirective } from '../directives/debounce/debounce-keyup.directive';
// import { NgSelectDebounceDirective } from '../directives/debounce/ng-select-debounce.directive';
// import { ShowWithPermissionsDirective } from './ShowWithPermissionsDirective';
// import { Wizard } from './shared/wizard/wizard.component';
// import { StepHostDirective } from './shared/wizard/directives/step-host.directive';
import { SharedTranslationPipe} from './i18n/shared-translation.pipe';
// import {GaugeComponent} from './shared/gauge-widget/gauge.component';
// import {InfiniteScrollComponent} from './shared/infinity/InfiniteScrollComponent';
// import { BarPlotComponent } from './shared/barplot-widget/barplot.component';
// import {HasChannelAccessDirective} from './HasChannelAccessDirective';
import {MatDialogActions, MatDialogContent, MatDialogTitle, MatDialogClose, MatDialogModule} from '@angular/material/dialog';
import { MatDivider } from '@angular/material/divider';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import {NgSelectDebounceDirective} from './directives/debounce/ng-select-debounce.directive';
import {DebounceKeyupDirective} from './directives/debounce/debounce-keyup.directive';
import {ListingComponent} from './components/listing/listing.component';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {FilterContainerComponent} from './components/filter-container/filter-container.component';
import {PageSizeSelectorComponent} from './components/page-size-selector/page-size-selector.component';
import {TimeAgoPipe} from './pipes/time-ago.pipe';
import {NoPermissionDisableDirective} from './directives/no-permission-disable.directive';
import {FilterBarComponent} from './components/filter-bar/filter-bar.component';
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
    // HasChannelAccessDirective,
    HasPermissionDirective,
    ConfirmationDialogComponent,
    SharedTranslationPipe,
    // ProgressBarsComponent,
    // JuicechainAuthComponent,
    // ProgressbarModule,
    HasPermissionHideDirective,
    MaterialPromiseButtonDirective,
    NgSelectDebounceDirective,
    DebounceKeyupDirective,
    PageSizeSelectorComponent,
    TimeAgoPipe,
    // ShowWithPermissionsDirective,
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
    // GaugeComponent,
    // InfiniteScrollComponent,
    // BarPlotComponent,
    // TimeProgressBarComponent,
    // BarPlotComponent,
    // StepHostDirective
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButton,
    MatIconButton,
    MatDivider,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatTooltip,
    MatProgressSpinner,
    MatSelect,
    MatOption,
    MatCheckbox,
    MatMenuModule,
    MatTooltipModule,
    MatTableModule,
    MatCardModule,
    MatSlideToggleModule,
    MatPaginatorModule,
    MatSortModule,
    MatAutocompleteModule,
    MatButtonToggleModule,
    MatTabsModule,
    MatChipsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    DragDropModule,
    MatIcon,
    ListingComponent,
    FilterContainerComponent,
    FilterBarComponent,
    MatToolbar,
    NoPermissionDisableDirective,
    // NoPermissionDisableDirective
  ],
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    AutoLanguageModule,
    // ProgressbarModule,
    // Angular2PromiseButtonModule.forRoot(),
    // QRCodeModule,
    // UiSwitchModule,
    // NgSelectModule,
    // AngularEditorModule,
    DragulaModule.forRoot(),
    MatDialogModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButton,
    MatIconButton,
    MatDivider,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatTooltip,
    MatProgressSpinner,
    MatSelect,
    MatOption,
    MatCheckbox,
    MatMenuModule,
    MatTooltipModule,
    MatTableModule,
    MatCardModule,
    MatSlideToggleModule,
    MatPaginatorModule,
    MatSortModule,
    MatAutocompleteModule,
    MatButtonToggleModule,
    MatTabsModule,
    MatChipsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    DragDropModule,
    MatIcon,
    RouterLink,
    RouterLinkActive,
    MatToolbar,
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
    NoPermissionDisableDirective
  ],
  providers: [
    importProvidersFrom(
      MatSidenavModule,
      MatToolbarModule,
      MatListModule,
      MatIconModule,
      MatButtonModule,
      MatCardModule,
      MatProgressSpinnerModule,
      MatFormFieldModule,
      MatInputModule,
      MatMenuModule,
      MatSnackBarModule,
      MatDialogModule,
      MatDividerModule,
      MatButtonToggleModule,
      MatChipsModule,
      MatDatepickerModule,
      MatNativeDateModule,
      DragDropModule
    )
  ]
})
export class SharedModule{}
