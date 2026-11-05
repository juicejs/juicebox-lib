import {Component, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {TimepickerComponent} from './timepicker.component';
import {TimeStruct} from '../datepicker/date-utils';

@Component({
  imports: [TimepickerComponent, ReactiveFormsModule],
  template: `<app-timepicker [formControl]="control" [seconds]="seconds()" [minuteStep]="15" />`,
})
class HostComponent {
  control = new FormControl<TimeStruct | null>(null);
  seconds = signal(false);
}

describe('TimepickerComponent', () => {
  async function setup(configure?: (host: HostComponent) => void) {
    TestBed.configureTestingModule({imports: [HostComponent]});
    const fixture = TestBed.createComponent(HostComponent);
    configure?.(fixture.componentInstance);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const unit = (label: string) => fixture.nativeElement.querySelector(`.app-timepicker-input[aria-label="${label}"]`) as HTMLInputElement;
    const type = async (label: string, text: string) => {
      unit(label).value = text;
      unit(label).dispatchEvent(new Event('change'));
      await fixture.whenStable();
    };
    const press = async (label: string, key: string) => {
      unit(label).dispatchEvent(new KeyboardEvent('keydown', {key}));
      await fixture.whenStable();
    };
    return {fixture, host: fixture.componentInstance, unit, type, press};
  }

  it('gives ngb\'s {hour, minute, second} once hours and minutes are set, null while one is empty', async () => {
    const {host, unit, type} = await setup();
    await type('Hours', '7');
    expect(host.control.value).toBeNull();
    expect(unit('Hours').value).toBe('07');
    await type('Minutes', '5');
    expect(host.control.value).toEqual({hour: 7, minute: 5, second: 0});
    await type('Minutes', '');
    expect(host.control.value).toBeNull();
  });

  it('steps by minuteStep with the arrow keys, carrying into the hours and wrapping at 24', async () => {
    const {fixture, host, unit, press} = await setup(h => h.control.setValue({hour: 23, minute: 50, second: 0}));
    expect(unit('Hours').value).toBe('23');
    await press('Minutes', 'ArrowUp');
    expect(host.control.value).toEqual({hour: 0, minute: 5, second: 0});
    await press('Minutes', 'ArrowDown');
    expect(host.control.value).toEqual({hour: 23, minute: 50, second: 0});
    // The spinner buttons step too
    (fixture.nativeElement.querySelector('.app-timepicker-spin') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(host.control.value).toEqual({hour: 0, minute: 50, second: 0});
  });

  it('shows seconds when asked', async () => {
    const {unit} = await setup(h => {
      h.seconds.set(true);
      h.control.setValue({hour: 8, minute: 0, second: 30});
    });
    expect(unit('Seconds').value).toBe('30');
  });
});
