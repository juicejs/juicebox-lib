import {Component, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {provideJuicebarTesting} from '../../../testing/juicebar-testing';
import {OptionComponent, SelectComponent} from './select.component';

@Component({
  imports: [ReactiveFormsModule, SelectComponent, OptionComponent],
  template: `
    <app-select [formControl]="picked" [multiple]="true" [searchable]="true" [externalSearch]="true">
      @for (plan of results(); track plan.id) {
        <app-option [value]="plan.id">{{ plan.name }}</app-option>
      }
    </app-select>
  `,
})
class HostComponent {
  picked = new FormControl<string[]>([]);
  results = signal([{id: 'a', name: 'Hall A'}, {id: 'b', name: 'Hall B'}]);
}

describe('SelectComponent', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => document.querySelector('.cdk-overlay-container')?.replaceChildren());

  it('keeps the labels of picked values when a server search replaces the options, as ng-select did', async () => {
    TestBed.configureTestingModule({imports: [HostComponent], providers: provideJuicebarTesting()});
    const fixture = TestBed.createComponent(HostComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('.app-select-trigger')!.click();
    await fixture.whenStable();
    const option = Array.from(document.querySelectorAll<HTMLElement>('.app-select-panel .app-option')).find(o => o.textContent?.trim() === 'Hall A');
    option!.click();
    await fixture.whenStable();

    fixture.componentInstance.results.set([{id: 'c', name: 'Hall C'}]);
    await fixture.whenStable();

    expect(fixture.componentInstance.picked.value).toEqual(['a']);
    expect(element.querySelector('.app-select-chips')?.textContent?.trim()).toBe('Hall A');
  });
});
