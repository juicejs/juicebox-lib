import { Directive, input, ElementRef, OnDestroy, inject } from '@angular/core';
import { Overlay, OverlayRef, OverlayPositionBuilder, ConnectedPosition } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { TooltipComponent } from './tooltip.component';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

@Directive({
  selector: '[appTooltip]',
  host: {
    '(mouseenter)': 'show()',
    '(mouseleave)': 'hide()'
  }
})
export class TooltipDirective implements OnDestroy {
  appTooltip = input<string>('');
  appTooltipPosition = input<TooltipPosition>('top');

  private overlay = inject(Overlay);
  private overlayPositionBuilder = inject(OverlayPositionBuilder);
  private elementRef = inject(ElementRef);
  private overlayRef?: OverlayRef;

  private getPosition(): ConnectedPosition {
    switch (this.appTooltipPosition()) {
      case 'right':
        return { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center', offsetX: 8 };
      case 'left':
        return { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center', offsetX: -8 };
      case 'bottom':
        return { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: 8 };
      case 'top':
      default:
        return { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom', offsetY: -8 };
    }
  }

  show() {
    if (this.overlayRef?.hasAttached() || !this.appTooltip()) {
      return;
    }

    const positionStrategy = this.overlayPositionBuilder
      .flexibleConnectedTo(this.elementRef)
      .withPositions([this.getPosition()]);

    this.overlayRef = this.overlay.create({ positionStrategy });
    const tooltipPortal = new ComponentPortal(TooltipComponent);
    const tooltipRef = this.overlayRef.attach(tooltipPortal);
    tooltipRef.instance.text = this.appTooltip();
  }

  hide() {
    if (this.overlayRef) {
      this.overlayRef.detach();
    }
  }

  ngOnDestroy() {
    this.overlayRef?.dispose();
  }
}
