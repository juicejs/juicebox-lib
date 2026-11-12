import {Component, DestroyRef, inject, input, OnInit, output, signal} from '@angular/core';
import {FormFieldComponent, InputDirective, LabelComponent} from '../../../../../../ui-components';
import {CommunicationsTranslationPipe} from '../../../i18n/communications.translation';

/**
 * Event parameters (EVENTPARAMS): the event data field that holds the addresses, given as typed; with `pause`
 * (the quick send) once typing has paused that long
 */
@Component({
  selector: 'app-event-params-recipients',
  templateUrl: './event-params.component.html',
  imports: [FormFieldComponent, LabelComponent, InputDirective, CommunicationsTranslationPipe],
})
export class EventParamsComponent implements OnInit {
  /** Milliseconds typing must pause before the text is given; 0 gives it at once */
  readonly pause = input(0);
  /** Changing a recipient: its parameters */
  readonly preset = input('');
  readonly paramsChange = output<string>();

  protected readonly text = signal('');
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  ngOnInit(): void {
    this.text.set(this.preset());
  }

  protected typed(value: string): void {
    this.text.set(value);
    clearTimeout(this.timer);
    const pause = this.pause();
    if (!pause) {
      this.paramsChange.emit(value);
      return;
    }
    this.timer = setTimeout(() => this.paramsChange.emit(value), pause);
  }
}
