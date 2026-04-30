import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-icon',
  template: '<i [class]="iconClass()">{{ iconText() }}</i>',
  styleUrls: ['./icon.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  host: {
    'class': 'app-icon'
  }
})
export class IconComponent {
  icon = input.required<string>();

  iconClass() {
    const iconName = this.icon();
    if (iconName.startsWith('fa-')) {
      return `fas ${iconName}`;
    }
    return 'material-icons';
  }

  iconText() {
    const iconName = this.icon();
    return iconName.startsWith('fa-') ? '' : iconName;
  }
}
