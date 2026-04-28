import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  template: '<ng-content></ng-content>',
  styleUrls: ['./card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule]
})
export class CardComponent {}

@Component({
  selector: 'app-card-header',
  template: '<ng-content></ng-content>',
  styleUrls: ['./card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  host: {
    'class': 'app-card-header'
  }
})
export class CardHeaderComponent {}

@Component({
  selector: 'app-card-title',
  template: '<ng-content></ng-content>',
  styleUrls: ['./card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  host: {
    'class': 'app-card-title'
  }
})
export class CardTitleComponent {}

@Component({
  selector: 'app-card-content',
  template: '<ng-content></ng-content>',
  styleUrls: ['./card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  host: {
    'class': 'app-card-content'
  }
})
export class CardContentComponent {}

@Component({
  selector: 'app-card-actions',
  template: '<ng-content></ng-content>',
  styleUrls: ['./card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  host: {
    'class': 'app-card-actions'
  }
})
export class CardActionsComponent {}

@Component({
  selector: 'app-card-footer',
  template: '<ng-content></ng-content>',
  styleUrls: ['./card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  host: {
    'class': 'app-card-footer'
  }
})
export class CardFooterComponent {}
