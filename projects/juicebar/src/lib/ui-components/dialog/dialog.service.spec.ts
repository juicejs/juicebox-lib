import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DIALOG_CARD_CLASS, DialogService } from './dialog.service';
import { ConfirmationDialogComponent } from '../../core/shared/components/confirmation-dialog/confirmation-dialog.component';
import { provideJuicebarTesting } from '../../../testing/juicebar-testing';

@Component({ template: '<p class="plain-dialog">Hello</p>' })
class PlainDialogComponent {}

describe('DialogService', () => {
  let dialog: DialogService;

  const panel = () => document.querySelector<HTMLElement>('.app-dialog-panel')!;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideJuicebarTesting() });
    dialog = TestBed.inject(DialogService);
  });

  afterEach(() => dialog.closeAll());

  it('opens a dialog that takes the whole screen on a phone', () => {
    dialog.open(PlainDialogComponent);

    expect(panel().classList).not.toContain(DIALOG_CARD_CLASS);
  });

  it('keeps a dialog a card on a phone when asked, next to its own panel classes', () => {
    dialog.open(PlainDialogComponent, { phone: 'card', panelClass: 'my-dialog' });

    expect(panel().classList).toContain(DIALOG_CARD_CLASS);
    expect(panel().classList).toContain('my-dialog');
  });

  it('keeps the confirmation dialog a card however it is opened', () => {
    dialog.open(ConfirmationDialogComponent, { data: { message: 'delete this' } });

    expect(panel().classList).toContain(DIALOG_CARD_CLASS);
  });
});
