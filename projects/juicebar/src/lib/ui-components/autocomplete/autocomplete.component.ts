import {ChangeDetectionStrategy, Component, ElementRef, forwardRef, input, output, signal, viewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {OverlayModule} from '@angular/cdk/overlay';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';

export interface AutocompleteOption<T = any> {
  value: T;
  label: string;
}

@Component({
  selector: 'app-autocomplete',
  template: `
    <div class="app-autocomplete" cdkOverlayOrigin #trigger="cdkOverlayOrigin" #triggerEl>
      <input type="text"
             class="app-autocomplete-input"
             [value]="inputValue()"
             [disabled]="disabled()"
             [attr.placeholder]="placeholder()"
             (input)="onInput($any($event.target).value)"
             (focus)="open()"
             (blur)="onBlur()">
    </div>
    <ng-template cdkConnectedOverlay
                 [cdkConnectedOverlayOrigin]="trigger"
                 [cdkConnectedOverlayWidth]="overlayWidth()"
                 [cdkConnectedOverlayOpen]="isOpen() && options().length > 0">
      <div class="app-autocomplete-panel" (mousedown)="$event.preventDefault()">
        @for (option of options(); track $index) {
          <div class="app-autocomplete-option" (click)="select(option)">
            {{ option.label }}
          </div>
        }
      </div>
    </ng-template>
  `,
  styles: [`
    :host { display: inline-block; width: 100%; }
    .app-autocomplete {
      width: 100%;
      height: 32px;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: var(--color-background);
      box-sizing: border-box;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .app-autocomplete:focus-within {
      border-color: var(--color-secondary);
      box-shadow: 0 0 0 3px rgba(var(--color-secondary-rgb), 0.15);
    }
    .app-autocomplete-input {
      width: 100%;
      height: 100%;
      border: none;
      outline: none;
      background: transparent;
      font: inherit;
      color: var(--color-text-primary);
      font-size: 12.5px;
      padding: 0 10px;
      box-sizing: border-box;
    }
    .app-autocomplete-input::placeholder { color: var(--color-text-disabled); }
    .app-autocomplete-panel {
      background: var(--color-background-secondary);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      box-shadow: 0 12px 32px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.4);
      max-height: 240px;
      overflow-y: auto;
      padding: 4px;
      box-sizing: border-box;
    }
    .app-autocomplete-option {
      height: 30px;
      padding: 0 10px;
      display: flex;
      align-items: center;
      border-radius: 5px;
      cursor: pointer;
      color: var(--color-text-primary);
      font-size: 12.5px;
    }
    .app-autocomplete-option:hover { background: var(--color-background); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, OverlayModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => AutocompleteComponent),
    multi: true,
  }],
})
export class AutocompleteComponent<T = any> implements ControlValueAccessor {
  placeholder = input<string>('');
  options = input<Array<AutocompleteOption<T>>>([]);
  displayWith = input<(value: T) => string>((v: any) => v == null ? '' : String(v));

  inputChange = output<string>();
  optionSelected = output<T>();

  inputValue = signal<string>('');
  isOpen = signal<boolean>(false);
  disabled = signal<boolean>(false);
  overlayWidth = signal<number | string>('auto');

  private triggerEl = viewChild<ElementRef<HTMLElement>>('triggerEl');

  private onChange: (value: T | string | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: T | null): void {
    this.inputValue.set(value == null ? '' : this.displayWith()(value));
  }
  registerOnChange(fn: (value: T | string | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled.set(disabled); }

  onInput(value: string): void {
    this.inputValue.set(value);
    this.onChange(value);
    this.inputChange.emit(value);
    this.syncOverlayWidth();
    this.isOpen.set(true);
  }

  open(): void {
    if (!this.disabled()) {
      this.syncOverlayWidth();
      this.isOpen.set(true);
    }
  }

  onBlur(): void {
    setTimeout(() => this.isOpen.set(false), 150);
    this.onTouched();
  }

  select(option: AutocompleteOption<T>): void {
    this.inputValue.set(option.label);
    this.onChange(option.value);
    this.optionSelected.emit(option.value);
    this.isOpen.set(false);
  }

  private syncOverlayWidth(): void {
    const el = this.triggerEl()?.nativeElement;
    if (el) {
      this.overlayWidth.set(el.offsetWidth);
    }
  }
}
