import {Component, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {SegmentedComponent, SegmentedOption} from './segmented.component';

@Component({
  imports: [SegmentedComponent],
  template: `<app-segmented label="Show locations" [options]="options" [(value)]="value" />`,
})
class HostComponent {
  readonly options: SegmentedOption<string>[] = [
    {value: 'all', label: 'All'},
    {value: 'mine', label: 'Mine'},
    {value: 'public', label: 'Public'},
  ];
  readonly value = signal('all');
}

describe('SegmentedComponent', () => {
  async function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const radios = () => Array.from(element.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
    const state = () => radios().map(radio => `${radio.textContent!.trim()}:${radio.getAttribute('aria-checked')}:${radio.tabIndex}`);
    return {fixture, element, radios, state, host: fixture.componentInstance};
  }

  it('is a radio group named by its label, with the chosen option as the one Tab stop', async () => {
    const {element, state} = await setup();
    const group = element.querySelector('[role="radiogroup"]')!;
    expect(element.querySelector(`#${group.getAttribute('aria-labelledby')}`)!.textContent).toBe('Show locations');
    expect(state()).toEqual(['All:true:0', 'Mine:false:-1', 'Public:false:-1']);
  });

  it('a click chooses an option and updates the bound value', async () => {
    const {radios, state, host, fixture} = await setup();
    radios()[2].click();
    await fixture.whenStable();
    expect(host.value()).toBe('public');
    expect(state()).toEqual(['All:false:-1', 'Mine:false:-1', 'Public:true:0']);
  });

  it('the arrow keys choose the next or previous option and wrap around', async () => {
    const {radios, host, fixture} = await setup();
    radios()[0].dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));
    await fixture.whenStable();
    expect(host.value()).toBe('mine');
    expect(document.activeElement).toBe(radios()[1]);
    radios()[1].dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true}));
    radios()[0].dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true}));
    await fixture.whenStable();
    expect(host.value()).toBe('public');
  });
});
