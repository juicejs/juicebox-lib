import {Component} from '@angular/core';

/**
 * The old juicebox's prices page of a customer: a placeholder there too, with no tab leading to it. It is kept so a
 * project's link to it still opens; a project with prices replaces it (componentOverrides, `['details/:id', 'prices-entity']`).
 */
@Component({
  selector: 'app-prices-entity',
  template: '<p>prices-entity works!</p>',
})
export class PricesEntityComponent {}
