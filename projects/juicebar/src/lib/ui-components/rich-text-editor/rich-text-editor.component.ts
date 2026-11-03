import { ChangeDetectionStrategy, Component, DOCUMENT, ElementRef, afterRenderEffect, computed, forwardRef, inject, input, signal, viewChild } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CdkMenuModule } from '@angular/cdk/menu';
import { AE_SANITIZER, AngularEditorComponent, AngularEditorConfig, AngularEditorModule } from '@kolkov/angular-editor';
import { IconComponent } from '../icon/icon.component';

/** The old juicebox admin's editor setup */
const DEFAULT_CONFIG: AngularEditorConfig = {
  // Runs cleanHtml (see the providers), which keeps inline styles, classes and tables
  sanitize: true,
  spellcheck: true,
  minHeight: '8rem',
  defaultParagraphSeparator: '',
  outline: false,
  fonts: [
    { class: 'arial', name: 'Arial' },
    { class: 'times-new-roman', name: 'Times New Roman' },
    { class: 'calibri', name: 'Calibri' },
    { class: 'comic-sans-ms', name: 'Comic Sans MS' },
  ],
};

const CSS_LENGTH = /^\d+(\.\d+)?(px|pt|em|rem|%)$/;
const URL_ATTRIBUTES = ['href', 'src', 'xlink:href', 'action', 'formaction', 'data'];

type EditorCommand = (command: string, value?: string) => void;

/**
 * Removes what would run in the admin when the HTML is shown: scripts, event handlers and `javascript:` URLs
 * (plus `<base>` and refresh `<meta>`). Everything else stays, unlike with Angular's sanitizer, which also strips styles and classes.
 */
function cleanHtml(html: string, inertDocument: Document): string {
  const holder = inertDocument.createElement('div');
  holder.innerHTML = html;
  holder.querySelectorAll('script, base, meta[http-equiv]').forEach(element => element.remove());
  for (const element of Array.from(holder.querySelectorAll('*'))) {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      // Browsers ignore control characters and spaces in a URL scheme ("java\tscript:")
      const isScriptUrl = URL_ATTRIBUTES.includes(name) && /^javascript:/i.test(attribute.value.replace(/[\u0000- ]/g, ''));
      if (name.startsWith('on') || name === 'srcdoc' || isScriptUrl) {
        element.removeAttribute(attribute.name);
      }
    }
  }
  return holder.innerHTML;
}

/**
 * Rich-text editor for HTML stored as a string (@kolkov/angular-editor).
 * The value is the HTML as stored: it changes only when the user edits, and an edit that
 * ends with the same content gives back the stored string unchanged.
 */
@Component({
  selector: 'app-rich-text-editor',
  templateUrl: './rich-text-editor.component.html',
  styleUrls: ['./rich-text-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AngularEditorModule, FormsModule, CdkMenuModule, IconComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditorComponent),
      multi: true,
    },
    {
      provide: AE_SANITIZER,
      useFactory: () => {
        const inertDocument = inject(DOCUMENT).implementation.createHTMLDocument('');
        return (html: string) => cleanHtml(html, inertDocument);
      },
    },
  ],
  host: {
    '[class.disabled]': 'isDisabled()',
    '(focusout)': 'onFocusOut($event)',
    '(paste)': 'onPaste($event)',
    '(drop)': 'onDrop($event)',
  }
})
export class RichTextEditorComponent implements ControlValueAccessor {
  /** Overrides of the default editor config, e.g. `{ height: '40vh' }` */
  readonly config = input<AngularEditorConfig>({});
  readonly placeholder = input('');
  /** Accessible name of the editing area */
  readonly ariaLabel = input<string | undefined>(undefined);
  /**
   * Lets images into the text: the insert-image button (uploading through `config.upload` or `config.uploadUrl`,
   * or embedding base64 without either), and pasting or dropping image files
   */
  readonly allowImages = input(false);
  /** Font sizes in CSS units (`['12px', '18px']`) in place of HTML's sizes 1–7 */
  readonly fontSizes = input<string[] | undefined>(undefined);
  readonly fontSizeLabel = input('Font size');

  protected readonly isDisabled = signal(false);
  protected readonly isSourceMode = signal(false);
  protected readonly editorConfig = computed<AngularEditorConfig>(() => {
    const config = { ...DEFAULT_CONFIG, ...this.config() };
    return {
      ...config,
      editable: config.editable !== false && !this.isDisabled(),
      // The toolbar's buttons would still edit a disabled editor
      showToolbar: config.showToolbar !== false && !this.isDisabled(),
      toolbarHiddenButtons: [
        ...(config.toolbarHiddenButtons ?? []),
        ...(this.allowImages() ? [] : [['insertImage']]),
        // Replaced by the CSS font size menu
        ...(this.fontSizes() ? [['fontSize']] : []),
      ],
    };
  });
  /** What the editor shows: the written value, then the editor's own HTML after each edit */
  protected readonly shown = signal('');

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly editor = viewChild.required(AngularEditorComponent);
  private readonly sanitize = inject(AE_SANITIZER);

  private stored = '';
  private storedAsShown = '';
  private lastValue = '';
  /** The selection the font size menu applies to; opening the menu moves focus away from the text */
  private fontSizeRange: Range | null = null;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    afterRenderEffect(() => {
      const area = this.textArea();
      area.setAttribute('role', 'textbox');
      area.setAttribute('aria-multiline', 'true');
      area.setAttribute('aria-disabled', String(this.isDisabled()));
      const label = this.ariaLabel();
      if (label) {
        area.setAttribute('aria-label', label);
      } else {
        area.removeAttribute('aria-label');
      }
    });
  }

  protected onEdit(html: string) {
    this.shown.set(html);
    const value = html === this.storedAsShown ? this.stored : html;
    // Switching to the source view and back reports the content again without a change
    if (value !== this.lastValue) {
      this.lastValue = value;
      this.onChange(value);
    }
  }

  protected onFocusOut(event: FocusEvent) {
    if (!this.host.nativeElement.contains(event.relatedTarget as Node | null)) {
      this.onTouched();
    }
  }

  protected onPaste(event: ClipboardEvent) {
    const clipboard = event.clipboardData;
    // A copied screenshot or image file would be embedded as base64; copied HTML still pastes
    if (!this.allowImages() && clipboard && !clipboard.types.includes('text/html')
      && Array.from(clipboard.files).some(file => file.type.startsWith('image/'))) {
      event.preventDefault();
    }
  }

  protected onDrop(event: DragEvent) {
    if (!this.allowImages() && event.dataTransfer?.types.includes('Files')) {
      event.preventDefault();
    }
  }

  protected saveFontSizeRange() {
    const area = this.textArea();
    const selection = area.ownerDocument.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    this.fontSizeRange = range && !range.collapsed && area.contains(range.commonAncestorContainer) ? range.cloneRange() : null;
  }

  /** Like the old juicebox editor: wraps the selected text in a span with the CSS size, as one undoable edit */
  protected applyFontSize(size: string, executeCommand: EditorCommand) {
    const range = this.fontSizeRange;
    this.fontSizeRange = null;
    if (!range || !CSS_LENGTH.test(size)) {
      return;
    }
    const area = this.textArea();
    const selection = area.ownerDocument.getSelection();
    area.focus();
    selection?.removeAllRanges();
    selection?.addRange(range);
    const holder = area.ownerDocument.createElement('div');
    holder.append(range.cloneContents());
    executeCommand('insertHTML', `<span style="font-size: ${size}">${holder.innerHTML}</span>`);
  }

  writeValue(value: string | null): void {
    this.stored = value ?? '';
    this.storedAsShown = this.sanitize(this.stored);
    this.lastValue = this.stored;
    this.shown.set(this.stored);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  private textArea(): HTMLElement {
    return this.editor().textArea.nativeElement;
  }
}
