import { DOCUMENT, Injectable, inject } from '@angular/core';
import { BASE_APP_CONFIG } from '../../../config/base-app.config';
import { JuiceboxService } from './Juicebox.service';
import { brandTokens, BrandTokens } from './brand-palette';

const DEFAULT_LOGO = 'assets/juicebar/images/logo_small.png';

/** The project's look from `provideJuicebar({ theme })`, like the old juicebox themes/<project> folder */
@Injectable({ providedIn: 'root' })
export class BrandService {
  private readonly theme = inject(BASE_APP_CONFIG, { optional: true })?.theme;
  private readonly juicebox = inject(JuiceboxService);
  private readonly document = inject(DOCUMENT);

  /** Logo on the login page */
  readonly logo = this.theme?.logo ?? DEFAULT_LOGO;
  /** Picture behind the login card, if the project has one */
  readonly loginImage = this.theme?.loginImage ?? null;

  /** Sidebar logo: the user's organisation logo when they have one, as in the old juicebox */
  sidebarLogo(): string {
    return this.juicebox.getUser()?.attributes?.organisationLogo || this.logo;
  }

  /** Runs once at startup: the brand colour's shades and the favicon */
  apply() {
    const tokens = this.theme?.primary ? brandTokens(this.theme.primary) : null;
    if (this.theme?.primary && !tokens) {
      console.warn(`juicebar: theme.primary "${this.theme.primary}" is not a hex colour; the default colours stay`);
    }
    if (tokens) {
      const style = this.document.createElement('style');
      style.id = 'juicebar-theme';
      // Outweighs the lib's :root and html.light-theme tokens, whatever order the stylesheets load in
      style.textContent = `:root:root{${this.declarations(tokens.dark)}}html.light-theme:root{${this.declarations(tokens.light)}}`;
      this.document.head.append(style);
    }
    if (this.theme?.favicon) {
      let icon = this.document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
      if (!icon) {
        icon = this.document.createElement('link');
        icon.rel = 'icon';
        this.document.head.append(icon);
      }
      icon.href = this.theme.favicon;
    }
  }

  private declarations(tokens: BrandTokens): string {
    return Object.entries(tokens).map(([name, value]) => `${name}:${value}`).join(';');
  }
}
