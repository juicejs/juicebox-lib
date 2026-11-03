import { ChangeDetectionStrategy, Component, DestroyRef, Signal, computed, forwardRef, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ButtonComponent } from '../button/button.component';
import { FormFieldComponent } from '../form-field/form-field.component';
import { IconComponent } from '../icon/icon.component';
import { ProgressSpinnerComponent } from '../progress-spinner/progress-spinner.component';

/** A file already stored for the record, e.g. the current image of an edited item */
export interface StoredFile {
  name?: string;
  url?: string;
}

type FileKind = 'image' | 'video' | 'file';

interface PickedFile {
  file: File;
  size: string;
  kind: FileKind;
  /** Object URL of an image or video, for its preview */
  url: string | null;
}

const IMAGE_EXTENSION = /\.(png|jpe?g|gif|svg|webp|avif)$/i;
const VIDEO_EXTENSION = /\.(mp4|webm|mov|ogv)$/i;

let nextFileInputId = 0;

/**
 * File picker as a form control: click or drop a file; the value is the `File` (or null),
 * or a `File[]` with `multiple`, where new picks are added to the list.
 * A file outside `accept` or over `maxSize` is refused with a message and not added.
 * The picker's own filter is not enough: a dropped file, or "All files" in the dialog, bypasses it.
 */
@Component({
  selector: 'app-file-input',
  templateUrl: './file-input.component.html',
  styleUrls: ['./file-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, IconComponent, ProgressSpinnerComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FileInputComponent),
      multi: true,
    }
  ],
  host: {
    '[attr.aria-busy]': 'busy()',
  }
})
export class FileInputComponent implements ControlValueAccessor {
  /**
   * Accepted files, as in the native `accept`: extensions (`.pdf`) and MIME types (`image/*`, `video/mp4`).
   * Prefer extensions for CSV and Excel: systems report different MIME types for them.
   */
  readonly accept = input('');
  /** Largest accepted file, in bytes */
  readonly maxSize = input<number | undefined>(undefined);
  readonly multiple = input(false);
  /** Shows picked images and videos, and the stored one */
  readonly preview = input(false);
  /** The stored file, shown until a new one is picked */
  readonly current = input<StoredFile | null>(null);
  /** The caller's upload is running: the field is locked and shows a spinner */
  readonly busy = input(false);

  /** Labels (the lib's ui-components have no dictionary; pass translated text) */
  readonly label = input<string | undefined>(undefined);
  readonly removeLabel = input('Remove file');
  readonly typeErrorLabel = input('This type of file is not accepted');
  readonly sizeErrorLabel = input('The file is too large');

  protected readonly zoneLabel = computed(() =>
    this.label() ?? (this.multiple() ? 'Choose files or drop them here' : 'Choose a file or drop it here'));

  /** id of the native input, so an app-label in the surrounding app-form-field labels it */
  protected readonly inputId: Signal<string> =
    inject(FormFieldComponent, { optional: true })?.controlId ?? signal(`app-file-input-${nextFileInputId++}`);
  protected readonly errorId = computed(() => `${this.inputId()}-error`);

  protected readonly picked = signal<PickedFile[]>([]);
  protected readonly stored = computed(() => {
    const current = this.current();
    if (!current || this.picked().length) {
      return null;
    }
    const urlPath = current.url?.split(/[?#]/)[0] ?? '';
    const name = current.name ?? urlPath.split('/').pop() ?? '';
    // The display name may have no extension; the URL usually does
    const nameKind = kindOf(name, '');
    return { name, url: current.url ?? null, kind: nameKind === 'file' ? kindOf(urlPath, '') : nameKind };
  });
  protected readonly errors = signal<string[]>([]);
  protected readonly isDragging = signal(false);
  private readonly isDisabled = signal(false);
  protected readonly isLocked = computed(() => this.isDisabled() || this.busy());

  private onChange: (value: File | File[] | null) => void = () => {};
  protected onTouched: () => void = () => {};

  constructor() {
    inject(DestroyRef).onDestroy(() => this.picked().forEach(revoke));
  }

  protected onSelect(event: Event) {
    const nativeInput = event.target as HTMLInputElement;
    this.take(Array.from(nativeInput.files ?? []));
    // Lets the same file be chosen again after it was refused or removed
    nativeInput.value = '';
  }

  protected onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(!this.isLocked());
  }

  protected onDragLeave(event: DragEvent) {
    // Moving over the zone's own icon and text also fires dragleave
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) {
      this.isDragging.set(false);
    }
  }

  protected onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    if (!this.isLocked()) {
      this.take(Array.from(event.dataTransfer?.files ?? []));
    }
  }

  protected remove(item: PickedFile) {
    revoke(item);
    this.picked.update(list => list.filter(picked => picked !== item));
    this.errors.set([]);
    this.emit();
    this.onTouched();
  }

  writeValue(value: File | File[] | null): void {
    this.picked().forEach(revoke);
    const files = value ? [value].flat() : [];
    this.picked.set(files.map(toPicked));
    this.errors.set([]);
  }

  registerOnChange(fn: (value: File | File[] | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  private take(files: File[]) {
    if (!files.length) {
      return;
    }
    const maxSize = this.maxSize();
    const wrongType: string[] = [];
    const tooLarge: string[] = [];
    const accepted: File[] = [];
    for (const file of this.multiple() ? files : files.slice(0, 1)) {
      if (!accepts(file, this.accept())) {
        wrongType.push(file.name);
      } else if (maxSize !== undefined && file.size > maxSize) {
        tooLarge.push(file.name);
      } else {
        accepted.push(file);
      }
    }
    this.errors.set([
      ...(wrongType.length ? [`${this.typeErrorLabel()}: ${wrongType.join(', ')}`] : []),
      ...(tooLarge.length ? [`${this.sizeErrorLabel()}: ${tooLarge.join(', ')}`] : []),
    ]);
    if (accepted.length) {
      const added = accepted.map(toPicked);
      if (this.multiple()) {
        this.picked.update(list => [...list, ...added]);
      } else {
        this.picked().forEach(revoke);
        this.picked.set(added);
      }
      this.emit();
    }
    this.onTouched();
  }

  private emit() {
    const files = this.picked().map(picked => picked.file);
    this.onChange(this.multiple() ? files : files[0] ?? null);
  }
}

function toPicked(file: File): PickedFile {
  const kind = kindOf(file.name, file.type);
  return { file, size: formatSize(file.size), kind, url: kind === 'file' ? null : URL.createObjectURL(file) };
}

function revoke(picked: PickedFile) {
  if (picked.url) {
    URL.revokeObjectURL(picked.url);
  }
}

function kindOf(name: string, type: string): FileKind {
  if (type.startsWith('image/') || IMAGE_EXTENSION.test(name)) {
    return 'image';
  }
  if (type.startsWith('video/') || VIDEO_EXTENSION.test(name)) {
    return 'video';
  }
  return 'file';
}

/** Whether `file` matches an `accept` list the way the native picker reads it */
function accepts(file: File, accept: string): boolean {
  const patterns = accept.split(',').map(pattern => pattern.trim().toLowerCase()).filter(Boolean);
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return !patterns.length || patterns.some(pattern => {
    if (pattern === '*' || pattern === '*/*') {
      return true;
    }
    if (pattern.startsWith('.')) {
      return name.endsWith(pattern);
    }
    if (pattern.endsWith('/*')) {
      return type.startsWith(pattern.slice(0, -1));
    }
    return type === pattern;
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
