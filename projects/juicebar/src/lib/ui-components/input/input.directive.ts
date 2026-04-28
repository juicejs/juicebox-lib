import { Directive } from '@angular/core';

@Directive({
  selector: 'input[appInput], textarea[appInput]',
  host: {
    'class': 'app-input'
  }
})
export class InputDirective {}
