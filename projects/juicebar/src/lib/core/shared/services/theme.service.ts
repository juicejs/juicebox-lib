import { Injectable, signal, inject } from '@angular/core';
import { JuiceboxService } from './Juicebox.service';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private juicebox = inject(JuiceboxService);
  readonly theme = signal<Theme>('dark');

  init(initial: Theme = 'dark') {
    this.theme.set(initial);
    this.apply(initial);
  }

  async toggle() {
    const next: Theme = this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(next);
    this.apply(next);
    const user = this.juicebox.getUser();
    if (user?._id) {
      await this.juicebox.saveUserSettings(user._id, { theme: next });
    }
  }

  private apply(t: Theme) {
    const html = document.documentElement;
    if (t === 'light') {
      html.classList.add('light-theme');
    } else {
      html.classList.remove('light-theme');
    }
  }
}
