import {
  afterRenderEffect,
  Component,
  computed,
  DOCUMENT,
  ElementRef,
  forwardRef,
  inject,
  input,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {ButtonComponent} from '../button/button.component';
import {IconComponent} from '../icon/icon.component';
import {TooltipDirective} from '../tooltip/tooltip.directive';
import {JSON_EDITOR_LABELS} from './json-editor.labels';
import {jsonErrorOffset, lineAt, tokenizeJson} from './json-syntax';

const INDENT = '  ';

let nextJsonEditorId = 0;

/**
 * Edits a JSON value as text, coloured, with line numbers: Format and Compact, undo and redo, and the line where the
 * text stops being JSON. A form control's value is the JSON the text holds: while the text is not JSON the value
 * stays the last JSON it held, as the old juicebox's editor (ang-jsoneditor) did, so check `valid()` before using it.
 * Nothing (null) shows an empty editor. Tab indents; Shift+Tab leaves the editor.
 */
@Component({
  selector: 'app-json-editor',
  templateUrl: './json-editor.component.html',
  styleUrl: './json-editor.component.scss',
  // The coloured pieces are made in code, outside the template
  encapsulation: ViewEncapsulation.None,
  imports: [ButtonComponent, IconComponent, TooltipDirective],
  providers: [{provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => JsonEditorComponent), multi: true}],
  host: {
    class: 'app-json-editor',
    '[class.app-json-editor--invalid]': 'errorLine() !== null',
    '[class.app-json-editor--disabled]': 'disabled()',
  },
})
export class JsonEditorComponent implements ControlValueAccessor {
  private readonly document = inject(DOCUMENT);
  protected readonly labels = inject(JSON_EDITOR_LABELS);
  /** The editor's name for assistive technology; without it the provided "JSON editor" */
  readonly label = input('');

  protected readonly statusId = `app-json-editor-status-${nextJsonEditorId++}`;
  protected readonly text = signal('');
  protected readonly disabled = signal(false);
  private readonly scrollTop = signal(0);
  private readonly scrollLeft = signal(0);
  protected readonly gutterTransform = computed(() => `translateY(${-this.scrollTop()}px)`);
  protected readonly codeTransform = computed(() => `translate(${-this.scrollLeft()}px, ${-this.scrollTop()}px)`);

  /** Where the text stops being JSON; null while it is JSON. An empty text is not JSON. */
  private readonly errorOffset = computed(() => {
    const text = this.text();
    try {
      JSON.parse(text);
      return null;
    } catch {
      return jsonErrorOffset(text) ?? text.length;
    }
  });
  /** Whether the text is JSON, so the form control's value is what it holds now */
  readonly valid = computed(() => this.errorOffset() === null);
  /** The line where the text stops being JSON, for the status under the editor; nothing while the editor is empty */
  protected readonly errorLine = computed(() => {
    const offset = this.errorOffset();
    return offset === null || !this.text().trim() ? null : lineAt(this.text(), offset);
  });
  private readonly lineCount = computed(() => this.text().split('\n').length);
  protected readonly lineNumbers = computed(() => Array.from({length: this.lineCount()}, (_, index) => index + 1));

  private readonly textarea = viewChild.required<ElementRef<HTMLTextAreaElement>>('textarea');
  private readonly code = viewChild.required<ElementRef<HTMLElement>>('code');

  private onChange: (value: unknown) => void = () => {};
  protected onTouched: () => void = () => {};

  constructor() {
    afterRenderEffect({
      write: () => {
        const text = this.text();
        // A value written by the form reaches the text area here; what is typed is already there
        const textarea = this.textarea().nativeElement;
        if (textarea.value !== text) textarea.value = text;
        this.paint(text);
      },
    });
  }

  writeValue(value: unknown): void {
    this.text.set(value === null || value === undefined ? '' : JSON.stringify(value, null, 2));
  }

  registerOnChange(onChange: (value: unknown) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(onTouched: () => void): void {
    this.onTouched = onTouched;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected onInput(): void {
    const text = this.textarea().nativeElement.value;
    this.text.set(text);
    try {
      this.onChange(JSON.parse(text));
    } catch {
      // Not JSON (yet): the value stays the last JSON the text held
    }
  }

  protected onScroll(): void {
    const textarea = this.textarea().nativeElement;
    this.scrollTop.set(textarea.scrollTop);
    this.scrollLeft.set(textarea.scrollLeft);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const command = event.ctrlKey || event.metaKey;
    if (event.key === 'Tab' && !event.shiftKey && !command && !event.altKey) {
      event.preventDefault();
      this.insert(INDENT);
    } else if (event.key === 'Enter' && !command && !event.altKey && !event.shiftKey) {
      event.preventDefault();
      this.insert('\n' + this.indentAfterCaret());
    } else if (command && !event.altKey && event.key.toLowerCase() === 'i') {
      // The old editor's shortcuts: Ctrl+I formats, Ctrl+Shift+I compacts
      event.preventDefault();
      if (event.shiftKey) this.compact();
      else this.format();
    }
  }

  protected format(): void {
    if (this.valid()) this.replaceText(JSON.stringify(JSON.parse(this.text()), null, 2));
  }

  protected compact(): void {
    if (this.valid()) this.replaceText(JSON.stringify(JSON.parse(this.text())));
  }

  protected undo(): void {
    this.textarea().nativeElement.focus();
    this.document.execCommand('undo');
  }

  protected redo(): void {
    this.textarea().nativeElement.focus();
    this.document.execCommand('redo');
  }

  /** A new line keeps the line's indent, one deeper after an opening bracket */
  private indentAfterCaret(): string {
    const textarea = this.textarea().nativeElement;
    const before = textarea.value.slice(0, textarea.selectionStart);
    const line = before.slice(before.lastIndexOf('\n') + 1);
    const indent = /^\s*/.exec(line)?.[0] ?? '';
    return /[{[]\s*$/.test(line) ? indent + INDENT : indent;
  }

  private replaceText(text: string): void {
    const textarea = this.textarea().nativeElement;
    textarea.focus();
    textarea.select();
    this.insert(text);
  }

  /** Through the browser's own editing, so Ctrl+Z takes it back; the input event then updates the value */
  private insert(text: string): void {
    const textarea = this.textarea().nativeElement;
    if (!this.document.execCommand('insertText', false, text)) {
      textarea.setRangeText(text, textarea.selectionStart, textarea.selectionEnd, 'end');
      this.onInput();
    }
  }

  /** The coloured copy of the text, under the transparent text area */
  private paint(text: string): void {
    const fragment = this.document.createDocumentFragment();
    for (const token of tokenizeJson(text)) {
      if (!token.kind) {
        fragment.append(token.text);
        continue;
      }
      const piece = this.document.createElement('span');
      piece.className = `app-json-editor__${token.kind}`;
      piece.textContent = token.text;
      fragment.append(piece);
    }
    // A last empty line keeps its height
    fragment.append('\n');
    this.code().nativeElement.replaceChildren(fragment);
  }
}
