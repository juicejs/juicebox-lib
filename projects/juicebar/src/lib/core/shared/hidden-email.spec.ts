import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { revealHiddenEmailsOnTap } from './hidden-email';

@Component({
  template: `
    <div class="row" (click)="opened = opened + 1">
      <span class="hidden-email">ana&#64;example.test</span>
      <a class="link" href="#somewhere"><span class="hidden-email">ivo&#64;example.test</span></a>
      <span class="other">Ana</span>
    </div>
  `,
})
class HostComponent {
  opened = 0;

  constructor() {
    revealHiddenEmailsOnTap();
  }
}

describe('revealHiddenEmailsOnTap', () => {
  const realMatchMedia = window.matchMedia;
  let host: HostComponent;
  let element: HTMLElement;

  /** A screen with or without a pointer that can be held over something */
  function pointer(hover: boolean) {
    window.matchMedia = ((query: string) => ({ matches: query === '(hover: hover)' ? hover : false, media: query })) as typeof window.matchMedia;
  }

  function setUp() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    host = fixture.componentInstance;
    element = fixture.nativeElement;
  }

  afterEach(() => {
    window.matchMedia = realMatchMedia;
  });

  it('shows a hidden e-mail on the first tap without opening the row, and opens the row on the next', () => {
    pointer(false);
    setUp();
    const email = element.querySelector<HTMLElement>('.hidden-email')!;

    email.click();
    expect(email.classList).toContain('hidden-email--shown');
    expect(host.opened).toBe(0);

    email.click();
    expect(host.opened).toBe(1);
  });

  it('does not follow a link the hidden e-mail is in', () => {
    pointer(false);
    setUp();
    const email = element.querySelector<HTMLElement>('.link .hidden-email')!;
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });

    email.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    expect(email.classList).toContain('hidden-email--shown');
  });

  it('leaves other taps alone', () => {
    pointer(false);
    setUp();

    element.querySelector<HTMLElement>('.other')!.click();

    expect(host.opened).toBe(1);
  });

  it('leaves the e-mail to the pointer where there is one', () => {
    pointer(true);
    setUp();
    const email = element.querySelector<HTMLElement>('.hidden-email')!;

    email.click();

    expect(email.classList).not.toContain('hidden-email--shown');
    expect(host.opened).toBe(1);
  });
});
