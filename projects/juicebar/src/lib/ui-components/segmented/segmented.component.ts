import {Component, ElementRef, computed, input, model, viewChildren} from '@angular/core';

export interface SegmentedOption<T = unknown> {
  value: T;
  label: string;
}

let nextSegmentedId = 0;

/**
 * A fixed choice of a few options that always has one, side by side, the chosen one filled: e.g. a listing's
 * "Show locations: All / Mine / Public". A radio group: Tab reaches the chosen option, the arrow keys choose another.
 * `[(value)]` binds the chosen value.
 */
@Component({
  selector: 'app-segmented',
  templateUrl: './segmented.component.html',
  styleUrl: './segmented.component.scss',
  host: {class: 'app-segmented'},
})
export class SegmentedComponent<T = unknown> {
  readonly options = input<SegmentedOption<T>[]>([]);
  readonly value = model<T | null>(null);
  /** Shown before the options; names the group */
  readonly label = input('');

  protected readonly labelId = `app-segmented-label-${nextSegmentedId++}`;
  /** The option Tab reaches: the chosen one, or the first */
  protected readonly focusIndex = computed(() => Math.max(this.options().findIndex(option => option.value === this.value()), 0));

  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('optionButton');

  protected select(value: T): void {
    if (value !== this.value()) this.value.set(value);
  }

  /** Arrow keys, Home and End move to another option and choose it (WAI-ARIA radio group) */
  protected onKeydown(event: KeyboardEvent): void {
    const options = this.options();
    const current = this.focusIndex();
    const target = ({
      ArrowRight: current + 1,
      ArrowDown: current + 1,
      ArrowLeft: current - 1,
      ArrowUp: current - 1,
      Home: 0,
      End: options.length - 1,
    } as Record<string, number>)[event.key];
    if (target === undefined || !options.length) return;
    event.preventDefault();
    const index = (target + options.length) % options.length;
    this.select(options[index].value);
    this.buttons()[index]?.nativeElement.focus();
  }
}
