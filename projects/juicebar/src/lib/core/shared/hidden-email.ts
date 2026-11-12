import { DestroyRef, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

const SHOWN = 'hidden-email--shown';

/**
 * `.hidden-email` shows its text while the pointer is over it. A touch screen has no pointer to hold there: the first
 * tap on a hidden e-mail shows it and does nothing else (it doesn't open the row or follow a link), and the next tap
 * does what a tap there does. This is for every `.hidden-email`, in the lib's listings, a project's own and dialogs,
 * so it listens on the document, before the click reaches the row.
 */
export function revealHiddenEmailsOnTap(): void {
  const document = inject(DOCUMENT);
  const onClick = (event: Event) => {
    const email = event.target instanceof Element ? event.target.closest('.hidden-email') : null;
    if (!email || email.classList.contains(SHOWN)) return;
    const view = document.defaultView;
    if (!view?.matchMedia || view.matchMedia('(hover: hover)').matches) return;
    email.classList.add(SHOWN);
    event.preventDefault();
    event.stopPropagation();
  };
  document.addEventListener('click', onClick, true);
  inject(DestroyRef).onDestroy(() => document.removeEventListener('click', onClick, true));
}
