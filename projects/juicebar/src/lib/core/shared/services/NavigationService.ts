import { Injectable, signal } from '@angular/core';

export interface MenuItem {
  label: string;
  route: string;
  icon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  private menuItems = signal<MenuItem[]>([]);

  getMenuItems() {
    return this.menuItems;
  }

  addMenuItem(item: MenuItem) {
    this.menuItems.update(items => [...items, item]);
  }

  addMenuItems(items: MenuItem[]) {
    this.menuItems.update(currentItems => [...currentItems, ...items]);
  }
}
