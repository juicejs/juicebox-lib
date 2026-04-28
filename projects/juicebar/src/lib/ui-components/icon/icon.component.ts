import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-icon',
  template: '<i [class]="iconClass()"></i>',
  styleUrls: ['./icon.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  host: {
    'class': 'app-icon'
  }
})
export class IconComponent {
  // Accepts icon name like 'email', 'lock', 'login', etc.
  // Uses Font Awesome or Material Icons based on prefix
  icon = input.required<string>();

  iconClass() {
    const iconName = this.icon();
    // If it starts with 'fa-', it's Font Awesome
    if (iconName.startsWith('fa-')) {
      return `fas ${iconName}`;
    }
    // Otherwise, treat as Material Icons
    return `material-icons ${iconName}`;
  }
}
