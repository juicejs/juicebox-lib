import { Component, ChangeDetectionStrategy, ElementRef, input, model, contentChildren, viewChildren } from '@angular/core';

@Component({
  selector: 'app-tab',
  template: '',
  styleUrls: ['./tabs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'app-tab',
    '[class.app-tab-active]': 'active()',
    '[class.app-tab-disabled]': 'disabled()'
  }
})
export class TabComponent {
  label = input.required<string>();
  active = model<boolean>(false);
  disabled = input<boolean>(false);
}

@Component({
  selector: 'app-tabs',
  template: `
    <div class="app-tabs-header" role="tablist" (keydown)="onKeydown($event)">
      @for (tab of tabs(); track tab; let i = $index) {
        <button
          #tabButton
          class="app-tab"
          role="tab"
          [attr.aria-selected]="selectedIndex() === i"
          [attr.tabindex]="selectedIndex() === i ? 0 : -1"
          [class.app-tab-active]="selectedIndex() === i"
          [class.app-tab-disabled]="tab.disabled()"
          [disabled]="tab.disabled()"
          (click)="selectTab(i)"
          type="button"
        >{{ tab.label() }}</button>
      }
    </div>
  `,
  styleUrls: ['./tabs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'app-tabs'
  }
})
export class TabsComponent {
  /** Two-way bindable; setting it emits `selectedIndexChange` */
  selectedIndex = model<number>(0);

  tabs = contentChildren(TabComponent);
  private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');

  selectTab(index: number) {
    if (this.tabs()[index]?.disabled()) return;
    this.selectedIndex.set(index);
  }

  /** Arrow keys, Home and End move focus between tabs; Enter or Space selects (WAI-ARIA tabs pattern) */
  protected onKeydown(event: KeyboardEvent) {
    const buttons = this.tabButtons().map(button => button.nativeElement).filter(button => !button.disabled);
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (current === -1) return;
    const target = ({ ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: buttons.length - 1 } as Record<string, number>)[event.key];
    if (target === undefined) return;
    event.preventDefault();
    buttons[(target + buttons.length) % buttons.length].focus();
  }
}
