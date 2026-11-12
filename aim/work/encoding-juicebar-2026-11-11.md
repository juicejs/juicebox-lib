# Encoding report: juicebar (2026-11-11)

Reverse encoding (AIM 6.4, §13) of the juicebar library's **categories**, **exports** and **locations** modules into the intent tree `juicebar`, with the root and the shared `juicebar.core`. Every `.aim` file carries `provenance: inferred` and waits for the owner's confirmation, intent by intent. No code was changed.

The tree is shaped like Stoked's admin: one web application, `juicebar`, and each module its own intent under it. Users follows in the same way.

This file covers the root, `juicebar.core` and categories. The exports and locations encodings have their own parts, with their sources, confidence per intent and questions:

- [parts/exports.md](./parts/exports.md) — 12 questions; the most important: the SAP data source's `admin` rule exists only in the admin, every organisation's templates are open to anyone with the role by default, and storing changed filters in the Excel dialog needs only `export`.
- [parts/locations.md](./parts/locations.md) — 17 questions; the most important: which venues staff see (the listing and opening a venue use different organisation rules), the lib's own delete confirmation, and archiving from the listing rewriting the whole location. The `room-plan` backend service was not found in any repository, so room plans are described from the lib's calls only.

- [parts/communications.md](./parts/communications.md) — encoded later the same day as the module's specification before it is built in the lib: the old juicebox (master `c6cca1640`) and the Juice 4.4.0 backend as they are now, without Quality Circle's additions (the owner's rulings). Confirmed in Studio on 2026-11-11 on the owner's instruction (`approved_by: Mario`); its bindings still point at the old admin and the backend until the lib's code exists. 8 questions, each a place where the old code contradicts itself.

After the first import, Studio required a few changes that are now in the files: every requirement, the root's included, needs an operation or a view that satisfies it, and a rule may not hang on a view's action.

## Method and scope

**Read:**

- The lib's categories module, the realization: `projects/juicebar/src/lib/core/modules/categories/**` (listing, create page, subcategory dialog, details tabs, media, included articles, options and configuration in `categories-shared.ts` and `config/base-app.config.ts`, the label dictionary), and its commit `6514f0c`.
- The shared media component the module uses: `projects/juicebar/src/lib/core/shared/components/media/**`.
- The backend: `juicejs/juice-modules`, `packages/shop/src/services/categories/**` (`CategoryService`, `MangedCategory`, `DefaultCategoryAccessStrategy`), at commit `b823636d` (2026-10-20).
- The functional reference: the old juicebox, `juicejs/juicebox` branch master, `src/app/categories/**`.

**Left out on purpose:**

- The framework: sign-in, the app shell, the top bar, the sidebar menu, the search, the compact listing beside an opened record, the module help text and the `ui-components`. They are hand-coded and not modelled.
- The visual design.
- The library's customization hooks: a project replacing the categories service (Carl Stahl's `carlstahl:shop:category`) or adding tabs through `componentOverrides`. These are realization; the tabs a project adds are behaviour of that project's own intent.

**Spec:** AIM 6.4. `aim/specs/spec.md` is the copy from github.com/juicejs/application-intent-model at commit `a13afc8`, fetched on 2026-11-11.

**Binding locators:**

- Paths are relative to the lib repository's root.
- `service:<juice service>#<method>` is a remotable backend method, such as `service:juicecommerce:categories#createCategory`.
- `configuration:<key>` names a backend configuration entry. The options the module reads are `juicecommerce:categories` (`showPublic`, `allowDelete`, `allowRootDelete`, `openCategoriesInNewTab`, `accessStrategy`), `juicecommerce:articles` (`showPublicStatus`) and `media` (collections and media types). The project's own options are given to the library with `provideCategories({options: {showInactive, confirmDeactivation, subcategoriesActive}})`.

## Confidence per intent

| Intent | Confidence | Why |
|---|---|---|
| `juicebar` | high | The cross-cutting rules are read from the backend's role filters, the per-language fields and the option switches of the module |
| `juicebar.core` | needs-human-check | `Organisation` holds only what categories need (id, name); users will add to it. The media rules come from the shared media component and the media service |
| `juicebar.categories` | high | Permissions and organisation scoping read from the backend's remotable filters and access strategy; ORGTREE from the lib only |
| `juicebar.categories.tree` | high | Read from the listing and the backend; question 4 on deleting a category with subcategories |
| `juicebar.categories.create` | needs-human-check | The public switch is sent but not stored by the backend (question 2) |
| `juicebar.categories.details` | needs-human-check | KEEPDESC is the backend's behaviour and may be a defect (question 3) |
| `juicebar.categories.media` | high | Read from the media tab, the shared media component and the backend |
| `juicebar.categories.articles` | high | Read from the tab and its backend call |
| `juicebar.categories.mine` | high | Read from the lib and the backend; question 5 on the permission |

## Questions for the owner

1. **Carl Stahl's and AMG's category parts are not in the lib.** The old juicebox's categories have, for Carl Stahl: SEO, redirects, characteristics (two versions), channels with drag-and-drop reordering inside a channel, a tile image tab and editing the included articles (`src/app/categories/details/*`, `listing/categories-listing.component.ts` lines 63–70 and 112 on). For AMG they have a navigation description and "no events available" on the details. The lib leaves these to the project, which brings its own category service and tabs (`categories.providers.ts`, `categories.service.ts`). The rule agreed on 2026-11-09 says a module moves into the lib with all its functionality. Should these parts be added to this intent, so the lib gets them, or does the project keep carrying them?
2. **A new category's public switch is not stored.** The create page and the subcategory dialog send `public` where `showPublic` is set (`category-form.ts#categoryData`, `child-category-dialog.component.ts#save`), but the backend's `createCategory` does not store it (`CategoryService.ts` lines 197–245); only `updateCategory` does. The intent says it is stored as given. Is Quality Circle's backend different, or is this a backend defect to fix?
3. **A description can't be cleared.** `updateCategory` replaces the description only when the new one is not empty (`MangedCategory.ts` line 35), so clearing it keeps the old text. KEEPDESC encodes that. Intended, or a defect?
4. **Deleting a category that has subcategories.** The backend deletes only that category (`CategoryService.ts` lines 296–321); its subcategories keep pointing at it and no longer show in the tree. Outside `allowRootDelete`, the lib offers delete on such categories. Should deleting be refused while a category has subcategories, delete them too, or stay as it is?
5. **The permission for Mine.** "Transfer to Mine" is disabled without the `update` permission in the lib, "Remove from Mine" needs none, and the backend asks only for `categories:role` for both. Which permission should each need?
6. **Reading other organisations' categories.** The backend's default access strategy shows a staff member only their own organisation's first-level categories and those without one. Quality Circle's Organisation and All filters show other organisations' categories, so its backend must use another `accessStrategy`. What is Quality Circle's rule, to state it in CATORG?
7. **The organisation tree's depth.** The lib asks for the related organisations four levels deep (`categories-shared.ts#loadRelatedOrganisations`). Is four the commitment?
8. **Who listens to `category:deleted`?** The backend announces every deleted category (`CategoryDeleted`). Nothing in the lib subscribes. If a project relies on it, its intent should name the subscriber.
