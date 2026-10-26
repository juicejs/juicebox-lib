import { inject } from '@angular/core';
import { USERS_CUSTOMIZATION } from '../../../config/base-app.config';
import { CustomTab, getCustomTabs } from '../../../config/route-customization';
import { JuiceboxService } from '../../shared/services/Juicebox.service';
import { UserTranslationPipe } from './i18n/user.translation';

/**
 * Tabs (or wizard steps) that the project adds under a users page via componentOverrides,
 * filtered by permission and with translated labels. Call in an injection context.
 */
export function injectCustomUserTabs(parentPath: string[]): CustomTab[] {
  const overrides = inject(USERS_CUSTOMIZATION, { optional: true })?.componentOverrides;
  const juicebox = inject(JuiceboxService);
  const pipe = inject(UserTranslationPipe);
  return getCustomTabs(overrides, parentPath, juicebox)
    .map(tab => ({ ...tab, label: translateTabLabel(pipe, tab.label) }));
}

/** A tab label may be a translation key or plain text */
export function translateTabLabel(pipe: UserTranslationPipe, label: string): string {
  const translated = pipe.transform(label);
  return typeof translated === 'string' && !translated.startsWith('@') ? translated : label;
}
