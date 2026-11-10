/** A link as the pages give it ('main/users', '/main/users?page=2') without its slashes and query */
const pathOf = (url: string | null | undefined) => (url ?? '').split('?')[0].replace(/^\/+|\/+$/g, '');

/**
 * Whether the workspace bar shows the way back to `link`, the module's listing that the page gave in its navigation
 * event. Only on a page under a module (a record, a wizard), never on a module's own page (/main/<module>): the link
 * is the last page's until the new page has started, and the address alone already tells a listing.
 */
export function backLinkShown(url: string | null | undefined, link: string | null | undefined): boolean {
  const path = pathOf(url);
  const target = pathOf(link);
  return !!target && target !== path && path.split('/').length > 2;
}
