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

@Directive({
  selector: '[selectionDetailDef]'
})
export class SelectionDetailDefDirective {
  readonly templateRef = inject(TemplateRef);
}

/** A row of the compact list (`[compact]`): `<ng-template compactRowDef let-row>…</ng-template>`, with phrasing content only */
@Directive({
  selector: '[compactRowDef]'
})
export class CompactRowDefDirective {
  readonly templateRef = inject(TemplateRef);
}
