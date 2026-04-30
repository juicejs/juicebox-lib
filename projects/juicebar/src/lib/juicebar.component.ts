import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import {
  IconComponent,
  ListItemComponent,
  NavListComponent,
  ProgressSpinnerComponent,
  SidenavComponent,
  ToolbarComponent,
} from './ui-components';
import { JuiceboxService } from './core/shared/services/Juicebox.service';

@Component({
  selector: 'juicebox-lib',
  imports: [
    CommonModule,
    RouterOutlet,
    ProgressSpinnerComponent
  ],
  template: `
    @if (isLoading()) {
      <div class="loading-container">
        <app-progress-spinner></app-progress-spinner>
        <p>Loading Juicebox...</p>
      </div>
    } @else {
      <router-outlet></router-outlet>
    }
  `,
  styles: [`
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      gap: 20px;
    }

    .loading-container p {
      font-size: 16px;
      color: #666;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JuicebarComponent implements OnInit {
  private juiceboxService = inject(JuiceboxService);
  private router = inject(Router);

  protected readonly isLoading = signal(true);

  async ngOnInit() {
    try {
      // Check if user is already logged in
      const isLoggedIn = this.juiceboxService.isLoggedIn();

      if (!isLoggedIn) {
        // Redirect to login if not logged in
        await this.router.navigate(['/login']);
      } else {
        // If logged in, navigate to main
        const currentRoute = this.router.url;
        if (currentRoute === '/' || currentRoute === '/login') {
          await this.router.navigate(['/main']);
        }
      }
    } catch (error) {
      console.error('Error during initialization:', error);
      await this.router.navigate(['/login']);
    } finally {
      this.isLoading.set(false);
    }
  }
}
