import { Component, ChangeDetectionStrategy } from '@angular/core';
import { SidebarUserComponent } from '../../../../../users/details/sidebar-user/sidebar-user.component';

@Component({
  selector: 'app-user-profile-sidebar',
  template: `<app-sidebar-user context="user-profile" [allowHidden]="false"></app-sidebar-user>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SidebarUserComponent]
})
export class UserProfileSidebarComponent {}
