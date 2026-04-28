import {NgModule, CUSTOM_ELEMENTS_SCHEMA, ModuleWithProviders} from '@angular/core';
import {MainComponent} from './main.component';
// import {NavigationComponent} from './navigation/navigation.component';
import {RouterModule, Routes} from '@angular/router';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {CommonModule} from '@angular/common';
// import {NgbModule} from '@ng-bootstrap/ng-bootstrap';
import {HttpClientModule} from '@angular/common/http';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {HelpComponent} from './navigation/help/help.component';
// import {SidebarComponent} from './sidebar/sidebar.component';
// import {ListingComponent} from '../shared/listing/listing.component';
import {MainTranslationPipe} from './i18n/main.translation';
// import {PageNotFoundComponent} from '../shared/page-not-found/page-not-found.component';
import {LoginComponent} from './login/login.component';
// import {AuthGuard} from '../../guards/auth.guard';
// import {ClientRouteGuard} from '../../guards/client-route.guard';
import {ForgotPasswordComponent} from "./login/forgot-password/forgot-password.component";
import {ResetPasswordComponent} from "./login/reset-password/reset-password.component";
// import {DefaultRouteService} from '../../services/DefaultRouteService';
// import {NgSelectModule} from '@ng-select/ng-select';
// import {UserProfileDetailsComponent} from './navigation/user-profile/tabs/details/user-profile-details.component';
// import {UserProfileSidebarComponent} from './navigation/user-profile/tabs/sidebar/user-profile-sidebar.component';
// import {UserProfileTabsComponent} from './navigation/user-profile/user-profile-tabs.component';
// import {ImageCropperModule} from 'ngx-image-cropper';
import {WelcomeMessageComponent} from './login/welcome-message/welcome-message.component';
// import {UnsavedChangesGuard} from '../../guards/unsaved-changes.guard';
// import {TotpTwoFaModalComponent} from './navigation/user-profile/components/totp-two-fa-modal/totp-two-fa-modal.component';
// import {UiSwitchModule} from 'ngx-ui-switch';
import {SidebarService} from '../../shared/services/sidebar.service';
import {DragulaModule} from 'ng2-dragula';
import {SharedModule} from '../../shared/shared.module';
import {NavigationComponent} from './navigation/navigation.component';
import {SidebarComponent} from './sidebar/sidebar.component';
import {ImageCropperComponent} from 'ngx-image-cropper';
import {BASE_APP_CONFIG, BaseAppConfig} from '../../../config/base-app.config';
import {Inject, Optional} from '@angular/core';

@NgModule({
    declarations: [
        // Moved to imports - standalone is default in Angular v20+
     ],
  imports: [
    CommonModule,
    RouterModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    DragulaModule,
    SharedModule,
    ImageCropperComponent,
    // Standalone components (default in Angular v20+)
    MainComponent,
    HelpComponent,
    MainTranslationPipe,
    WelcomeMessageComponent,
    ResetPasswordComponent,
    ForgotPasswordComponent,
    LoginComponent,
    NavigationComponent,
    SidebarComponent
  ],
    exports: [RouterModule, MainTranslationPipe],
    providers: [],
    bootstrap: [],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class MainComponentModule {

   constructor(private sidebarService: SidebarService, @Optional() @Inject(BASE_APP_CONFIG) private config?: BaseAppConfig) {

     // Only register built-in modules if they're enabled
     if (!config?.builtInModules?.users || config.builtInModules.users.enabled !== false) {
       sidebarService.registerSidebarItem("users", "users", "users:role",
         "fa-users", "users");
     }

     if (!config?.builtInModules?.exports || config.builtInModules.exports.enabled !== false) {
       sidebarService.registerSidebarItem("exports", "exports", "exports:role",
         "fa-table", "exports");
     }

     // Register dynamic sidebar items from mainRoutes
     if (config && config.mainRoutes) {
       config.mainRoutes.forEach(moduleConfig => {
         if (moduleConfig.navigation) {
           sidebarService.registerSidebarItem(
             moduleConfig.path,
             moduleConfig.navigation.label,
             moduleConfig.navigation.role,
             moduleConfig.navigation.icon || 'fa-circle',
             moduleConfig.path
           );
         }
       });
     }
   }

}
