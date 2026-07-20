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
    return 'material-icons';
  }

  iconText() {
    const iconName = this.icon();
    if (iconName.startsWith('fa-')) {
      return FA_TO_MATERIAL[iconName] ?? iconName.slice(3).replace(/-/g, '_');
    }
    return iconName;
  }
}

/** FontAwesome → Material Icons ligature map for legacy `fa-*` icon names. */
const FA_TO_MATERIAL: Record<string, string> = {
  'fa-plus-circle': 'add_circle',
  'fa-plus': 'add',
  'fa-calendar': 'calendar_today',
  'fa-users': 'people',
  'fa-user': 'person',
  'fa-graduation-cap': 'school',
  'fa-school': 'school',
  'fa-address-book': 'contacts',
  'fa-location-dot': 'location_on',
  'fa-map-location-dot': 'location_on',
  'fa-map-marker': 'location_on',
  'fa-map-marker-alt': 'location_on',
  'fa-map': 'map',
  'fa-edit': 'edit',
  'fa-trash': 'delete',
  'fa-download': 'download',
  'fa-upload': 'upload',
  'fa-save': 'save',
  'fa-search': 'search',
  'fa-check': 'check',
  'fa-times': 'close',
  'fa-arrow-left': 'arrow_back',
  'fa-arrow-right': 'arrow_forward',
  'fa-chevron-left': 'chevron_left',
  'fa-chevron-right': 'chevron_right',
};
