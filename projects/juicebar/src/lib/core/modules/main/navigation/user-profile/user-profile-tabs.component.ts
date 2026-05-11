import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { JuiceboxService } from '../../../../shared/services/Juicebox.service';
import { MainTranslationPipe } from '../../i18n/main.translation';
import { SharedModule } from '../../../../shared/shared.module';

@Component({
  selector: 'app-user-profile-tabs',
  templateUrl: './user-profile-tabs.component.html',
  styleUrls: ['./user-profile-tabs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SharedModule, MainTranslationPipe]
})
export class UserProfileTabsComponent {
  private juicebox = inject(JuiceboxService);

  protected readonly sidebarTabHidden = computed(() =>
    !!this.juicebox.getOptions().sidebarPermissions
  );
}
