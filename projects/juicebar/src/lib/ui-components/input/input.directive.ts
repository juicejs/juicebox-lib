import { Directive } from '@angular/core';

@Directive({
  selector: 'input[appInput], textarea[appInput], select[appInput]',
  host: {
    'class': 'app-input'
  }
})
export class InputDirective {}
