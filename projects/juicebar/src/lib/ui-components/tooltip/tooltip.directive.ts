import { Directive, input, ElementRef, OnDestroy, inject, signal } from '@angular/core';
import { Overlay, OverlayRef, OverlayPositionBuilder, ConnectedPosition } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { TooltipComponent } from './tooltip.component';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

let nextTooltipId = 0;

@Directive({
  selector: '[appTooltip]',
  host: {
    '(mouseenter)': 'show()',
    '(mouseleave)': 'hide()',
    // Keyboard users get the tooltip too, and Escape closes it
    '(focusin)': 'show()',
    '(focusout)': 'hide()',
    '(keydown.escape)': 'hide()',
    '[attr.aria-describedby]': 'describedBy()'
  }
})
export class TooltipDirective implements OnDestroy {
  appTooltip = input<string>('');
  appTooltipPosition = input<TooltipPosition>('top');
  appTooltipTitle = input<string>('');

  private overlay = inject(Overlay);
  private overlayPositionBuilder = inject(OverlayPositionBuilder);
  private elementRef = inject(ElementRef);
  private overlayRef?: OverlayRef;
  private readonly tooltipId = `app-tooltip-${nextTooltipId++}`;
  protected readonly describedBy = signal<string | null>(null);

  private getPositions(): ConnectedPosition[] {
    switch (this.appTooltipPosition()) {
      case 'right':
        return [
          { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center', offsetX: 8 },
          { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center', offsetX: -8 },
        ];
      case 'left':
        return [
          { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center', offsetX: -8 },
          { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center', offsetX: 8 },
        ];
      case 'bottom':
        return [
          { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 8 },
          { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -8 },
        ];
      case 'top':
      default:
        return [
          { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -8 },
          { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 8 },
        ];
    }
  }

  show() {
    if (this.overlayRef?.hasAttached() || !this.appTooltip()) {
      return;
    }

    const positionStrategy = this.overlayPositionBuilder
      .flexibleConnectedTo(this.elementRef)
      .withFlexibleDimensions(false)
      .withPush(false)
      .withViewportMargin(8)
      .withPositions(this.getPositions());

    this.overlayRef = this.overlay.create({ positionStrategy });
    const tooltipPortal = new ComponentPortal(TooltipComponent);
    const tooltipRef = this.overlayRef.attach(tooltipPortal);
    tooltipRef.instance.text = this.appTooltip();
    tooltipRef.instance.title = this.appTooltipTitle();
    tooltipRef.instance.id = this.tooltipId;
    this.describedBy.set(this.tooltipId);
  }

  hide() {
    if (this.overlayRef) {
      this.overlayRef.detach();
    }
    this.describedBy.set(null);
  }

  ngOnDestroy() {
    this.overlayRef?.dispose();
  }
}
