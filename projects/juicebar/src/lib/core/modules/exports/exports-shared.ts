import {inject} from '@angular/core';
import {EXPORTS_CUSTOMIZATION, ExportsOptions} from '../../../config/base-app.config';
import {JuiceboxService} from '../../shared/services/Juicebox.service';

/** The project's exports options (provideExports({ options })). Call in an injection context. */
export function injectExportsOptions(): ExportsOptions {
  return inject(EXPORTS_CUSTOMIZATION, {optional: true})?.options ?? {};
}

/** The ids of the filters this user doesn't see (ExportsOptions.hiddenFilters) */
export function hiddenFilterIds(options: ExportsOptions, juicebox: JuiceboxService): Set<string> {
  return new Set((options.hiddenFilters ?? [])
    .filter(rule => juicebox.hasPermission(rule.permission) && !(rule.unless && juicebox.hasPermission(rule.unless)))
    .map(rule => rule.filter));
}

/**
 * Whether the gateway answered with an error instead of the file: a small JSON answer with an error, or an error
 * text. The old dialogs also took a small file without a comma for one and failed on files that aren't JSON.
 */
export async function isFailedExport(file: Blob): Promise<boolean> {
  if (file.size > 4096) return false;
  const text = await file.text();
  try {
    const answer = JSON.parse(text);
    return !!answer && typeof answer === 'object' && (!!answer.error || answer.success === false);
  } catch {
    return /^\s*Error/.test(text);
  }
}

/** The message for a download that failed: a cancelled one (ExportsOptions.downloadTimeoutMs) or another */
export function exportErrorKey(error: unknown): 'export_timeout' | 'download_failed' {
  return (error as {name?: string} | null)?.name === 'TimeoutError' ? 'export_timeout' : 'download_failed';
}
