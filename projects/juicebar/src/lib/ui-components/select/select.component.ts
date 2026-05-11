import {
  Component, ChangeDetectionStrategy, input, output, model, signal,
  contentChildren, computed, ElementRef, inject, OnDestroy, AfterContentInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkConnectedOverlay, CdkOverlayOrigin, OverlayModule } from '@angular/cdk/overlay';

@Component({
  selector: 'app-option',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  host: {
    'class': 'app-option',
    '[class.app-option-selected]': 'selected()',
    '[class.app-option-disabled]': 'disabled()',
    '[attr.aria-disabled]': 'disabled()',
  }
})
export class OptionComponent {
  value = input.required<any>();
  disabled = input<boolean>(false);
  selected = model<boolean>(false);

  readonly el = inject(ElementRef<HTMLElement>);

  getLabel(): string {
    return this.el.nativeElement.textContent?.trim() ?? '';
  }
}

@Component({
  selector: 'app-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, OverlayModule]
})
export class SelectComponent implements AfterContentInit {
  value = model<any>(null);
  disabled = input<boolean>(false);
  placeholder = input<string>('Select an option');

  selectionChange = output<{ value: any }>();

  isOpen = signal(false);

  private options = contentChildren(OptionComponent);

  protected readonly displayValue = computed(() => {
    const opts = this.options();
    const val = this.value();
    const match = opts.find(o => this.equals(o.value(), val));
    return match ? match.getLabel() : '';
  });

  ngAfterContentInit() {}

  toggle() {
    if (!this.disabled()) {
      this.isOpen.update(v => !v);
    }
  }

  close() {
    this.isOpen.set(false);
  }

  select(option: OptionComponent) {
    if (option.disabled()) return;
    this.value.set(option.value());
    this.selectionChange.emit({ value: option.value() });
    this.close();
  }

  isSelected(option: OptionComponent): boolean {
    return this.equals(option.value(), this.value());
  }

  private equals(a: any, b: any): boolean {
    return a === b;
  }

  getOptions() {
    return this.options();
  }
}
