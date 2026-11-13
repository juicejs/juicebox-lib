# Module guide

How a module is built on `@juicejs/juicebar`: in a project's admin, or in the library itself. It is written for whoever writes the module, which is usually Claude. Read it in full before writing or restructuring a module.

A module is one entry in the sidebar with its own screens under `/main/<name>`: a listing, a record's page, the dialogs around them, one service for the backend and one dictionary of labels.

## 1. Before any code

- **Porting a module from the old juicebox** (`juicejs/juicebox`, branch `master`): the old module is the reference. Read it first. Functionality stays exactly as it is there: the same backend calls and payloads, permissions, defaults, validation, and every label in every language its dictionary has. Do not add features or "improve" behaviour. Where the old module has a bug, or something cannot be kept, list it and ask.
- **A module of the library** is built from its intent: see `AGENTS.md` and `/aim/` in the juicebox-lib repository. The intent is written and confirmed first, then the code, then the intent's bindings are pointed at the code.
- **A module of a project** follows that project's own process (its `CLAUDE.md`, and its `AGENTS.md` if it has one).
- Other projects may share the same backend. What a module sends is a contract: service name, method name, argument order, payload shape, default values and the paging base all stay as the backend has them.

## 2. Start from the generator

```
# in a project built on the library
ng g @juicejs/juicebar:module orders --label "Orders" --role orders:role --service orders

# in the juicebox-lib repository, for a module of the library (after `npm run build:schematics`)
ng g ./dist/juicebar/schematics/collection.json:module orders --lib --label "Orders"
```

Options: `--route` (the address under `/main/` and the sidebar id; default the name. A ported module keeps the old juicebox's, e.g. `ng g …:module configurations --lib --route configuration`, so links and staff's saved sidebar order keep working), `--label` (what staff read; default the name, capitalised), `--role` (default `<name>:role`), `--service` (the backend service; default the name), `--icon` (a Material icon name; default `label`), `--path` (default `src/app/modules`), `--project`.

It writes the skeleton below and wires it in:

- in a project, an entry in `provideJuicebar({ mainRoutes: [...] })` in `app.config.ts`, which is also the sidebar entry;
- with `--lib`, the module's `provide<Name>()`, its customization token in `config/base-app.config.ts`, its sidebar entry in `core/modules/main/main.providers.ts`, the export in `public-api.ts`, and `provide<Name>()` in the playground.

The skeleton compiles and runs as it is. Then replace its placeholder backend methods and its single `name` field with what the module really has.

## 3. What a module consists of

```
<name>/
├── <name>.routes.ts            project: the routes, default export   (library: <name>.route.ts + <name>.providers.ts)
├── <name>.service.ts           every backend call of the module, nothing else
├── <name>.types.ts             the records as the backend keeps them
├── i18n/<name>_dictionary.ts   the labels
├── i18n/<name>.translation.ts  the `translate` pipe over that dictionary
├── listing/                    the listing page; also the compact list of the split view
├── details/                    a record's page
└── create/                     the dialog that creates a record
```

Add folders as the module grows (one per screen or dialog), keep components small, and keep logic in `.ts`, markup in `.html`, styles in `.scss`.

## 4. Rules

### Shell

- **Routes.** The listing is the route `''` with `data: {listingPane: true}`; a record is `details/:id` with `data: {splitView: true}`. Both are children of one route. That is the split view: while a record is open, the layout shows the listing as a compact list beside it. The listing component reads `injectListingPane()` to know it is the compact one, and keeps what it showed last in `ListingStateService`.
- **On a phone** (768px and below) the listing's table shows its rows as a list by itself: the first column names a row, the `actions` column's buttons stand next to the name and the other columns under it. There is nothing to do, unless the first column is not the whole name or the table sorts; see "On a phone" in `src/lib/ui-components/data-table/README.md`.
- **Breadcrumb.** Every screen calls `juicebox.navigationEvent({location, subject, link})`: the module's name, what is open, and the listing's address. The breadcrumb's first part is the way back to the listing; there is no Back button and no page title.
- **Page actions** (Create, …) go in the workspace bar with `juicebox.setActionButtons([...])`, not into the page.
- **A record's header** is `juicebox.setPageHeader({scope, title})` with the record's address as `scope`; clear it with `setPageHeader(null)` when the page is destroyed.
- **Leaving with unsaved changes** asks first: put `canDeactivate: [unsavedChangesGuard]` on the route and keep the page's fields in a `FormGroup` on the component.
- **Tabs.** A module's tabs are `app-tabs`. A second level inside a tab is an `app-segmented`, never a second row of the same tabs. A listing under tabs sits directly on the tabs' line.

### Backend and permissions

- One service per module, calling `Juice.request(service, method, [arguments])`. No backend call from a component.
- Requests that can overlap (paging, filters, typing) count their answers, so a slower older one cannot replace a newer one.
- The sidebar shows the module to staff whose role has it. Inside the module, check permissions with `juicebox.hasPermission('<role>#<permission>')` or the `hasPermissions` / `hasPermissionsHide` directives, exactly where the old module checked them.

### Labels

- Every text on screen comes from the module's dictionary through `| translate` or the pipe's `transform()`. No text in templates, no headline or intro copy, nothing made up.
- Every label has English and German. A ported module keeps every text its old dictionary had in other languages (`hr_HR`, `ru_RU`, `da_DK`, `sv_SE`, `fi_FI`, `cs_CZ`, `sk_SK`, `pt_PT`, `en_DE`). A label without a text in the admin's language shows as `@key`; do not invent translations to hide that.

### Interface

- Only the library's `app-*` components and the Angular CDK. No Angular Material, no other UI library.
- **Listings** are an `app-data-table` inside `<div class="parent listing-page">`. Row actions are icon buttons (`app-button appearance="icon"`) with a tooltip and an `aria-label`. A click on a row opens the record.
- **Confirmations** use `ConfirmationDialogComponent` through `DialogService`, with `destructive: true` for a delete. Never `window.confirm` or `window.alert`.
- **Notices** are `juicebox.showToast('success' | 'error' | 'warning' | 'info', text)`.
- **Dialogs** are opened with `DialogService` and built from `app-dialog-title`, `app-dialog-content` and `app-dialog-actions`. Their buttons are `type="button"` with a click handler, so Enter in a field does not create or send anything.
- **Forms** are reactive, with `app-form-field`, `app-label`, `appInput` and `app-error`. A button that waits for the backend takes `[promiseBtn]`.
- **Numbers in the sidebar** are the project's to give (`sidebarCount` in the app config); a module does not draw its own.

### Angular

The library is Angular 20+ in its current idiom, zoneless:

- standalone components without `standalone: true` or `changeDetection`; `inject()`, `input()`, `output()`;
- state in signals, derived state in `computed()`; a plain field changed after an `await` does not show;
- `@if`, `@for` with `track`, `@switch`; no `ngClass` or `ngStyle`; host bindings in the decorator's `host`;
- no method calls in templates: bind signals, `computed()` values or plain fields.

In the juicebox-lib repository, `CLAUDE.md` has these rules in full.

### Styles

- SCSS, as little as possible. Reuse the global classes: `parent`, `listing-page`, `dt-row-link`, `dt-row-actions`, `badge`.
- Colours come from the theme's tokens by default (`var(--color-text-primary)`, `var(--color-border)`, `var(--color-secondary)`, …), so a module follows the light and the dark theme. A hard-coded colour is fine where it is meant; it then stays the same in both themes.
- Accessibility is part of the look: labels on fields, names on icon buttons, focus that can be seen, WCAG AA contrast.

## 5. Before calling it done

1. It compiles and builds: `ng build` in a project; in the library `npx ngc -p projects/juicebar/tsconfig.lib.json --noEmit`, `npm run build` and `ng test juicebar --watch=false`.
2. Look at every screen in the running admin, in both themes and with the sidebar collapsed. On a shared or staging backend only look: do not send, run, delete or create anything real.
3. For a ported module, compare with the old one once more, call by call and label by label: payloads, permissions, defaults, what is read again after each action, and the dictionary's languages.
4. Say plainly what was not tried and why.
