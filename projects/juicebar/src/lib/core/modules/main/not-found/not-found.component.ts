import { ChangeDetectionStrategy, Component } from '@angular/core';
import { GlobalTranslationPipe } from '../../../i18n/global.translation';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GlobalTranslationPipe]
})
export class NotFoundComponent {}
