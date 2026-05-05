import { Directive, input, TemplateRef, inject } from '@angular/core';

@Directive({
  selector: '[cellDef]'
})
export class CellDefDirective {
  readonly cellDef = input.required<string>();
  readonly templateRef = inject(TemplateRef);
}

@Directive({
  selector: '[headerDef]'
})
export class HeaderDefDirective {
  readonly headerDef = input.required<string>();
  readonly templateRef = inject(TemplateRef);
}
