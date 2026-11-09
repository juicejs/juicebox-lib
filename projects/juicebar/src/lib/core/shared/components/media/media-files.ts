import {MediaText, PerLanguage} from './media.types';

/**
 * The address of a stored file: files on Spaces have a full address, local ones a path on the backend
 * (`media/...`, in older records `public/media/...`)
 */
export function fileUrl(path: string | undefined, endpoint: string): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${endpoint}/${path.replace(/^\/?(public\/)?/, '')}`;
}

/** A file's own text shown in a message that is read as HTML */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Images and videos are previewed; other files are downloaded */
export function isPreviewable(mimeType: string | undefined): boolean {
  return !!mimeType && (mimeType.startsWith('image') || mimeType.startsWith('video'));
}

export function isPerLanguage(value: MediaText | undefined): value is PerLanguage {
  return !!value && typeof value === 'object';
}

/** The text in `language`, or the one text a record stores */
export function textIn(value: MediaText | undefined, language: string): string {
  return isPerLanguage(value) ? (value[language] ?? '') : (value ?? '');
}

/**
 * A detail edited in one language: the other languages stay. An emptied language is taken out, and a detail
 * left with no language is null.
 */
export function withText(value: MediaText | undefined, language: string, text: string): PerLanguage | null {
  const {[language]: _edited, ...others} = isPerLanguage(value) ? value : {};
  const next: PerLanguage = text ? {...others, [language]: text} : others;
  return Object.keys(next).length ? next : null;
}
