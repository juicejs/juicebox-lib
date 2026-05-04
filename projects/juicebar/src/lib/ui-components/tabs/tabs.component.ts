import { Component, ChangeDetectionStrategy, input, model, output, contentChildren, computed, effect } from '@angular/core';

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
    <div class="app-tabs-header">
      @for (tab of tabs(); track tab; let i = $index) {
        <button
          class="app-tab"
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
  selectedIndex = model<number>(0);
  selectedIndexChange = output<number>();

  tabs = contentChildren(TabComponent);

  selectTab(index: number) {
    if (this.tabs()[index]?.disabled()) return;
    this.selectedIndex.set(index);
    this.selectedIndexChange.emit(index);
  }
}
