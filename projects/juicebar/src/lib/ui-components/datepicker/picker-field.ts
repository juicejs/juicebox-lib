import {Directive, DOCUMENT, ElementRef, TemplateRef, computed, effect, inject, input, signal, untracked, viewChild} from '@angular/core';
import {ConnectedPosition} from '@angular/cdk/overlay';
import {ValidationErrors} from '@angular/forms';
import {FormFieldComponent} from '../form-field/form-field.component';
import {CalendarDayContext, CalendarOutsideDays} from './calendar.component';
import {DateInput, dayKey, toDate} from './date-utils';

/**
 * ngb's autoClose: `true` closes the panel on a pick and on a click outside, `'outside'` only on a click outside,
 * `'inside'` only on a pick, `false` on neither. Escape and the calendar button always close it.
 */
export type PickerAutoClose = boolean | 'inside' | 'outside';

/** ngb's placements: below the field, else above it, lined up with its left or right edge */
const PANEL_POSITIONS: ConnectedPosition[] = [
  {originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4},
  {originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 4},
  {originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4},
  {originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -4},
];

/**
 * What app-datepicker, app-date-range-picker and app-datetime-picker share, after the old ngbDatepicker inputs: the field
 * with its calendar button, the panel, its closing and focus, the calendar's inputs and the minDate/maxDate check.
 * `open()`, `close()` and `toggle()` are public, as on ngb's `#d="ngbDatepicker"`, e.g. for buttons in a `footerTemplate`.
 */
@Directive()
export abstract class PickerField {
  placeholder = input<string>('');
  /** No typing: the date is only picked in the panel, which the field then opens too (the old read-only ngb inputs) */
  readonly = input(false);
  /** See `PickerAutoClose`; each field has the old default when it is not set */
  autoClose = input<PickerAutoClose | undefined>(undefined);
  minDate = input<DateInput>(null);
  maxDate = input<DateInput>(null);
  /** The month the calendar shows while there is no date (ngb's startDate) */
  startDate = input<DateInput>(null);
  /** Days that can't be picked (ngb's markDisabled) */
  markDisabled = input<((date: Date) => boolean) | null>(null);
  displayMonths = input(1);
  outsideDays = input<CalendarOutsideDays | undefined>(undefined);
  showWeekNumbers = input(false);
  dayTemplate = input<TemplateRef<CalendarDayContext> | null>(null);
  /** Shown below the calendar (ngb's footerTemplate) */
  footerTemplate = input<TemplateRef<unknown> | null>(null);

  protected abstract readonly defaultAutoClose: PickerAutoClose;

  /** The text field gets the form field's control id, so the field's app-label labels it */
  protected readonly inputId = inject(FormFieldComponent, {optional: true})?.controlId;
  protected readonly positions = PANEL_POSITIONS;
  protected readonly isOpen = signal(false);

  /** Disabled by the form control (`control.disable()`) or a permission directive */
  private readonly formDisabled = signal(false);
  private readonly externallyDisabled = signal(false);
  protected readonly isDisabled = computed(() => this.formDisabled() || this.externallyDisabled());

  protected readonly min = computed(() => toDate(this.minDate()));
  protected readonly max = computed(() => toDate(this.maxDate()));

  private readonly field = viewChild.required<ElementRef<HTMLElement>>('field');
  private readonly toggleButton = viewChild.required<ElementRef<HTMLButtonElement>>('toggleButton');
  private readonly document = inject(DOCUMENT);
  /** Where the focus goes back to when the panel closes: the button or the read-only field that opened it */
  private returnFocusTo: HTMLElement | null = null;

  protected onTouched: () => void = () => {};
  protected onValidatorChange: () => void = () => {};

  constructor() {
    // As ngb: a new minDate or maxDate checks the date again
    effect(() => {
      this.min();
      this.max();
      untracked(() => this.onValidatorChange());
    });
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close(true);
    } else {
      this.open();
    }
  }

  open(): void {
    if (this.isDisabled() || this.isOpen()) return;
    const active = this.document.activeElement as HTMLElement | null;
    this.returnFocusTo = active && this.field().nativeElement.contains(active) ? active : this.toggleButton().nativeElement;
    this.isOpen.set(true);
  }

  /** `restoreFocus` after a pick or Escape; not after a click elsewhere, which moves the focus itself */
  close(restoreFocus = false): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.onTouched();
    if (restoreFocus) this.returnFocusTo?.focus();
  }

  private get autoCloseMode(): PickerAutoClose {
    return this.autoClose() ?? this.defaultAutoClose;
  }

  protected closeAfterPick(): void {
    if (this.autoCloseMode === true || this.autoCloseMode === 'inside') this.close(true);
  }

  protected onOutsideClick(): void {
    if (this.autoCloseMode === true || this.autoCloseMode === 'outside') this.close();
  }

  protected onInputClick(): void {
    if (this.readonly()) this.toggle();
  }

  protected onInputBlur(): void {
    if (!this.isOpen()) this.onTouched();
  }

  /** ngb's minDate/maxDate errors, under its `ngbDate` key */
  protected rangeErrors(date: Date, actual: unknown): ValidationErrors | null {
    const minDate = this.min();
    if (minDate && dayKey(date) < dayKey(minDate)) return {ngbDate: {minDate: {minDate, actual}}};
    const maxDate = this.max();
    if (maxDate && dayKey(date) > dayKey(maxDate)) return {ngbDate: {maxDate: {maxDate, actual}}};
    return null;
  }

  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  registerOnValidatorChange(fn: () => void): void { this.onValidatorChange = fn; }

  setDisabledState(disabled: boolean): void {
    this.formDisabled.set(disabled);
    if (disabled) this.close();
  }

  setExternallyDisabled(disabled: boolean): void {
    this.externallyDisabled.set(disabled);
    if (disabled) this.close();
  }
}
