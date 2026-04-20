import {Component} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterOutlet } from '@angular/router';
import {MatListItem, MatNavList} from "@angular/material/list";
import {MatIcon} from "@angular/material/icon";
import {MatProgressSpinner} from "@angular/material/progress-spinner";
import {Observable} from 'rxjs';

@Component({
  selector: 'juicebox-lib',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatSidenavModule,
    MatToolbarModule,
    RouterLink,
    // UserMenuComponent,
    // LoginComponent,
    MatNavList,
    MatIcon,
    MatListItem,
    MatProgressSpinner
  ],
  template: `
    @if (isLoading$ | async) {
      <div class="loading-container">
        <mat-spinner></mat-spinner>
      </div>
    } @else {
      <router-outlet></router-outlet>
    }
  `,
})

export class JuicebarComponent {
  isLoading$: Observable<boolean>;

  constructor() {
    // this.isLoading$ = this.authService.isLoading$;
  }
}
