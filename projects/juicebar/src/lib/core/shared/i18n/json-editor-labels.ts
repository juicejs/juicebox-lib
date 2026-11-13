import { inject } from '@angular/core';
import { JsonEditorLabels } from '../../../ui-components/json-editor/json-editor.labels';
import { JuiceboxService } from '../services/Juicebox.service';
import { SharedTranslationPipe } from './shared-translation.pipe';

/**
 * The JSON editor's texts from the shared dictionary, for JSON_EDITOR_LABELS. Each is read when an editor asks for it,
 * in the language of the user who is signed in then.
 */
export function translatedJsonEditorLabels(): JsonEditorLabels {
  const juicebox = inject(JuiceboxService);
  const text = (key: string): string => new SharedTranslationPipe(juicebox).transform(key);
  return {
    get editor() { return text('json_editor'); },
    get format() { return text('format_json'); },
    get compact() { return text('compact_json'); },
    get undo() { return text('undo'); },
    get redo() { return text('redo'); },
    get invalid() { return text('invalid_json'); },
    get line() { return text('line'); },
  };
}
