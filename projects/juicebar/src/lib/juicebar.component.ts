import {Component, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import {MatListItem, MatNavList} from "@angular/material/list";
import {MatIcon} from "@angular/material/icon";
import {MatProgressSpinner} from "@angular/material/progress-spinner";
import {BehaviorSubject, Observable} from 'rxjs'
import { JuiceboxService } from './core/shared/services/Juicebox.service';

@Component({
  selector: 'juicebox-lib',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatSidenavModule,
    MatToolbarModule,
    RouterLink,
    MatNavList,
    MatIcon,
    MatListItem,
    MatProgressSpinner
  ],
  template: `
    @if (isLoading$ | async) {
      <div class="loading-container">
        <mat-spinner></mat-spinner>
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
  `]
})

export class JuicebarComponent implements OnInit {
  isLoading$: Observable<boolean>;
  private loadingSubject = new BehaviorSubject<boolean>(true);

  constructor(
    private juiceboxService: JuiceboxService,
    private router: Router
  ) {
    this.isLoading$ = this.loadingSubject.asObservable();
  }

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
      this.loadingSubject.next(false);
    }
  }
}
