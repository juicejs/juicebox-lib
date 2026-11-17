import {Component, inject} from '@angular/core';
import {DIALOG_DATA, DialogContentComponent, DialogTitleComponent} from '../../../../../ui-components';

/** One of a customer's images, as wide as the dialog */
@Component({
  selector: 'app-image-viewer-dialog',
  template: `
    <app-dialog-title />
    <app-dialog-content>
      <img [src]="imagePath" alt="" />
    </app-dialog-content>
  `,
  styleUrl: './image-viewer-dialog.component.scss',
  imports: [DialogTitleComponent, DialogContentComponent],
})
export class ImageViewerDialogComponent {
  protected readonly imagePath = inject<string>(DIALOG_DATA);
}
