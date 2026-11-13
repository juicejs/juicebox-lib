import { InjectionToken } from '@angular/core';

/**
 * The texts of the JSON editor. Provided once (the lib translates them from its shared dictionary), they are every
 * editor's. A project that wants other words provides the token.
 */
export interface JsonEditorLabels {
  /** The editor's name for assistive technology, unless the editor is given its own */
  editor: string;
  /** Indents the JSON (Ctrl+I) */
  format: string;
  /** Takes out every space between the values (Ctrl+Shift+I) */
  compact: string;
  undo: string;
  redo: string;
  /** Under the editor while the text is not JSON */
  invalid: string;
  /** Before the number of the line where the text stops being JSON */
  line: string;
}

export const DEFAULT_JSON_EDITOR_LABELS: JsonEditorLabels = {
  editor: 'JSON editor',
  format: 'Format JSON',
  compact: 'Compact JSON',
  undo: 'Undo',
  redo: 'Redo',
  invalid: 'Invalid JSON',
  line: 'Line',
};

export const JSON_EDITOR_LABELS = new InjectionToken<JsonEditorLabels>('JSON_EDITOR_LABELS', {
  providedIn: 'root',
  factory: () => DEFAULT_JSON_EDITOR_LABELS,
});
