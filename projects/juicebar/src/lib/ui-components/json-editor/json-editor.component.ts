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
import {AbstractControl, ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator} from '@angular/forms';
import {ButtonComponent} from '../button/button.component';
import {IconComponent} from '../icon/icon.component';
import {TooltipDirective} from '../tooltip/tooltip.directive';
import {JSON_EDITOR_LABELS} from './json-editor.labels';
import {jsonErrorOffset, lineAt, tokenizeJson} from './json-syntax';

const INDENT = '  ';

let nextJsonEditorId = 0;

/** The text read as JSON: its value, or where it stops being JSON (an empty text is not JSON) */
type Parsed = {value: unknown} | {errorOffset: number};

/**
 * Edits a JSON value as text, coloured, with line numbers: Format and Compact, undo and redo, and the line where the
 * text stops being JSON. A form control's value is the JSON the text holds. While the text is not JSON the value stays
 * the last JSON it held, as the old juicebox's editor (ang-jsoneditor) did, and the control has the error
 * `invalidJson`. Nothing (null) shows an empty editor. Enter keeps the line's indent; Tab moves on, as in any field.
 */
@Component({
  selector: 'app-json-editor',
  templateUrl: './json-editor.component.html',
  styleUrl: './json-editor.component.scss',
  // The coloured pieces are made in code, outside the template
  encapsulation: ViewEncapsulation.None,
  imports: [ButtonComponent, IconComponent, TooltipDirective],
  providers: [
    {provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => JsonEditorComponent), multi: true},
    {provide: NG_VALIDATORS, useExisting: forwardRef(() => JsonEditorComponent), multi: true},
  ],
  host: {
    class: 'app-json-editor',
    '[class.app-json-editor--invalid]': 'errorLine() !== null',
    '[class.app-json-editor--disabled]': 'disabled()',
  },
})
export class JsonEditorComponent implements ControlValueAccessor, Validator {
  private readonly document = inject(DOCUMENT);
  /** Read once: the provided labels may be translated on each read */
  protected readonly labels = {...inject(JSON_EDITOR_LABELS)};
  /** The editor's name for assistive technology; without it the provided "JSON editor" */
  readonly label = input('');

  protected readonly statusId = `app-json-editor-status-${nextJsonEditorId++}`;
  protected readonly text = signal('');
  protected readonly disabled = signal(false);

  private readonly parsed = computed<Parsed>(() => {
    const text = this.text();
    try {
      return {value: JSON.parse(text)};
    } catch {
      return {errorOffset: jsonErrorOffset(text) ?? text.length};
    }
  });
  /** Whether the text is JSON, so the form control's value is what it holds now */
  readonly valid = computed(() => 'value' in this.parsed());
  /** The line where the text stops being JSON, for the status under the editor; nothing while the editor is empty */
  protected readonly errorLine = computed(() => {
    const parsed = this.parsed();
    return 'value' in parsed || !this.text().trim() ? null : lineAt(this.text(), parsed.errorOffset);
  });
  private readonly lineCount = computed(() => this.text().split('\n').length);
  protected readonly lineNumbers = computed(() => Array.from({length: this.lineCount()}, (_, index) => index + 1));

  private readonly textarea = viewChild.required<ElementRef<HTMLTextAreaElement>>('textarea');
  private readonly code = viewChild.required<ElementRef<HTMLElement>>('code');
  private readonly codeFrame = viewChild.required<ElementRef<HTMLElement>>('codeFrame');
  private readonly gutterLines = viewChild.required<ElementRef<HTMLElement>>('gutterLines');

  private onChange: (value: unknown) => void = () => {};
  protected onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};

  constructor() {
    afterRenderEffect({
      write: () => {
        const text = this.text();
        // A value written by the form reaches the text area here; what is typed is already there
        const textarea = this.textarea().nativeElement;
        if (textarea.value !== text) {
          textarea.value = text;
          this.onScroll();
        }
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

  validate(_control: AbstractControl): ValidationErrors | null {
    return this.valid() ? null : {invalidJson: true};
  }

  registerOnValidatorChange(onValidatorChange: () => void): void {
    this.onValidatorChange = onValidatorChange;
  }

  protected onInput(): void {
    this.text.set(this.textarea().nativeElement.value);
    const parsed = this.parsed();
    if ('value' in parsed) this.onChange(parsed.value);
    // Not JSON (yet): the value stays the last JSON the text held, and the control learns it is now invalid
    else this.onValidatorChange();
  }

  /** The coloured copy and the line numbers follow the text area's scrolling, without a change detection */
  protected onScroll(): void {
    const {scrollTop, scrollLeft} = this.textarea().nativeElement;
    this.codeFrame().nativeElement.style.transform =`translate(${-scrollLeft}px, ${-scrollTop}px)`;
    this.gutterLines().nativeElement.style.transform = `translateY(${-scrollTop}px)`;
  }

  protected onKeydown(event: KeyboardEvent): void {
    // A key that finishes an input method's composition (Japanese, Chinese, …) belongs to it
    if (event.isComposing || event.keyCode === 229) return;
    const command = event.ctrlKey || event.metaKey;
    if (event.key === 'Enter' && !command && !event.altKey && !event.shiftKey) {
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
    const parsed = this.parsed();
    if ('value' in parsed) this.replaceText(JSON.stringify(parsed.value, null, 2));
  }

  protected compact(): void {
    const parsed = this.parsed();
    if ('value' in parsed) this.replaceText(JSON.stringify(parsed.value));
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
