import { ChangeDetectionStrategy, Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ProgressSpinnerComponent } from './ui-components';

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
  styleUrl: './juicebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JuicebarComponent implements OnInit {
  protected readonly isLoading = signal(true);

  ngOnInit() {
    this.isLoading.set(false);
  }
}
