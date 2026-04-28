import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-snackbar',
  template: `
    <div class="app-snackbar">
      <span class="message">{{ message }}</span>
      @if (action) {
        <button class="action">{{ action }}</button>
      }
    </div>
  `,
  styleUrls: ['./snackbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule]
})
export class SnackbarComponent {
  message = '';
  action = '';
}
