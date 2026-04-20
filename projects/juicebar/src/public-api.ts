/**
 * JUICEBAR ANGULAR LIBRARY
 *
 * IMPORTANT: To use this library, you must import the styles in your consuming application:
 *
 * Method 1 - Add to your app's styles.scss:
 * @import '~juicebar/styles';
 *
 * Method 2 - Add to your angular.json styles array:
 * "styles": ["node_modules/juicebar/styles.scss", "src/styles.scss"]
 *
 * This includes Material Design theme, utility classes (jb-*), and component styles.
 */

// Main components & bootstrap
export * from './lib/juicebar.component';
export * from './lib/bootstrap';

// Configuration
export * from './lib/config/base-app.config';
export * from './lib/config/app.config';

// Modules
export * from './lib/core/shared/shared.module';
export * from './lib/core/modules/main/main.component.module';

// Directives
export * from './lib/core/shared/directives/MaterialPromiseButton';
export * from './lib/core/shared/directives/HasPermissionDirective';
export * from './lib/core/shared/directives/HasPermissionHideDirective';
export * from './lib/core/shared/directives/no-permission-disable.directive';
export * from './lib/core/shared/directives/debounce/ng-select-debounce.directive';
export * from './lib/core/shared/directives/debounce/debounce-keyup.directive';

// Components
export * from './lib/core/shared/components/confirmation-dialog/confirmation-dialog.component';
export * from './lib/core/shared/components/listing/listing.component';
export * from './lib/core/shared/components/filter-container/filter-container.component';
export * from './lib/core/shared/components/page-size-selector/page-size-selector.component';
export * from './lib/core/shared/components/filter-bar/filter-bar.component';

// Services
export * from './lib/core/shared/services/configuration.service';

// Pipes
export * from './lib/core/shared/i18n/shared-translation.pipe';
export * from './lib/core/shared/pipes/time-ago.pipe';
export * from './lib/core/modules/main/i18n/main.translation';


// Types and interfaces
export * from './lib/core/shared/types/QueryOptions';
export * from './lib/core/shared/types/ComparedConfiguration';
export * from './lib/core/shared/types/Configuration';
export * from './lib/core/shared/types/Result';
export * from './lib/core/shared/types/ActionButton';
export * from './lib/core/shared/interfaces/ISort';
export * from './lib/core/shared/interfaces/ISearchTerm';
export * from './lib/core/shared/models/trainee.model';
export * from './lib/core/shared/models/searchprovider.interface';

// Additional services
export * from './lib/core/shared/services/socket.service';
export * from './lib/core/shared/services/NavigationService';
export * from './lib/core/shared/services/client-routes.service';
export * from './lib/core/shared/services/Juicebox.service';
export * from './lib/core/shared/services/sidebar.service';
export * from './lib/core/shared/services/helper.service';
export * from './lib/core/shared/services/CustomDatepickerI18n';
export * from './lib/core/shared/services/juice.service';

// Socket.io module and service
export * from './lib/core/shared/socket-io/socket-io.service';
export * from './lib/core/shared/socket-io/socket-io.module';
export * from './lib/core/shared/socket-io/config/socket-io.config';

// Additional pipes
export * from './lib/core/shared/pipes/TranslationPipe';
export * from './lib/core/shared/pipes/auto-language.pipe';

// Utilities and validators
export * from './lib/core/shared/util';
export * from './lib/core/shared/CustomValidators';

// Auto-language module and component
export * from './lib/core/shared/auto-language/auto-language.module';
export * from './lib/core/shared/auto-language/auto-language.component';

// Shared i18n dictionary
export * from './lib/core/shared/i18n/shared_dictionary';

// Table data type
export * from './lib/core/shared/components/listing/table-data';
