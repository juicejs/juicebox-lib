# juicebox-lib review: core, users and design (2026-10-26)

This compares the new juicebox-lib (`juicebar`) with the old juicebox (Angular 13) for the **core** and the **users** module, and reviews the **design** against the `design/direction-a*.jsx` mockups. A design that differs from old juicebox is intended and is not reported as a problem.

The review only read code; no app was run. Items marked **(verified)** were checked by hand in the code after the review. Items marked **(unsure)** need a browser check.

Path prefixes:
- `juicebox/` = `/Users/mario/radni/juicebox/src/`
- `lib/` = `juicebox-lib/projects/juicebar/src/lib/`
- `users/` = `lib/core/modules/users/`
- `main/` = `lib/core/modules/main/`
- `ui/` = `lib/ui-components/`

---

## 1. Summary and priorities

The service layer was copied almost line for line: `Juice`, `JuiceboxService`, `SidebarService`, the configuration service, sockets and the permission logic. All backend RPC calls for core and users are still there. The regressions sit in the UI glue, routing and extension points. The new design follows direction A, but the component system underneath is fragile.

### A. Broken: fix first (affects every client)

| # | Problem | Where | Status |
|---|---|---|---|
| 1 | **Every `showToast` closes immediately.** The options object is passed as `duration` to `SnackbarService.open(msg, action, duration: number)`, so `setTimeout(fn, {…})` runs after 0 ms. All save/error feedback, the 2FA reminder and "Missing Permission" are invisible (about 90 call sites). | `lib/core/shared/services/Juicebox.service.ts:204-211`, `ui/snackbar/snackbar.service.ts:11` | verified |
| 2 | **Password recovery doesn't work.** Forgot-password only shows "email sent" and calls nothing. There is no `/reset-password` route, and the reset component is a stub. The link in the reset email cannot work. | `main/login/forgot-password/forgot-password.component.ts:55-65`, `lib/bootstrap.ts:107-128` | verified |
| 3 | **Permission gates are not enforced on `app-button` / `app-checkbox`.** `[hasPermissions]` sets the `disabled` attribute in ngOnInit, then the app-button host binding `[disabled]="disabled()"` resets it. app-checkbox only reads its own input. Read-only admins can click save, change passwords, reset 2FA and edit role permissions; only the backend stops them. | `lib/core/shared/directives/HasPermissionDirective.ts`, `ui/button/button.component.ts:15` | verified in code, check in a browser |
| 4 | **`hasPermission('pdf:role')` throws** because there is no `#`, so `perm` is undefined. This can blank the whole tab bar on user details for users who have `pdf:role`. | `users/details/details.component.ts:81` | verified |
| 5 | **Operator-precedence bug** (`A && B \|\| C`) hides the German "Person als Benutzer anlegen" button in every project. | `users/listing/user-listing.component.ts:143-144` | verified |
| 6 | **Session polling went from 5 min to 30 s by default**, which is 10× more `/juicebox/app/verify` calls. | `lib/core/shared/services/Juicebox.service.ts:847` (old: 300000) | verified |
| 7 | **Groups tab removes groups without confirmation and ignores `result.success`**, so it always shows a success toast. | `users/details/groups-user/groups-user.component.ts:204-248` | |
| 8 | **No unsaved-changes guard on user details.** Old had `canDeactivate: [UnsavedChangesGuard]`. The guard also can't see the new signal-wrapped forms. | `users/users.route.ts:46-49` | |
| 9 | **No wildcard / 404 route.** An unknown URL gives a NavigationError. | `lib/bootstrap.ts` | |
| 10 | **The exports sidebar entry uses `exports:role`** while the module and search use `data-export:role`, so users with only the old role lose the menu entry. | `main/main.providers.ts:20` | |
| 11 | **Login:** the submit button is outside `<form>`, so Enter likely doesn't submit (unsure). There is no double-click protection. `returnUrl` ignores base-href (unsure, depends on deploy). | `main/login/login.component.html:15,99,107` | |

### B. Missing functionality: decide to port or drop

- **Translations:** the main dictionary has only `en_GB` and `de_DE`. Old had 10 languages (cs, da, de, en, fi, hr, ru, sk, sv, partial pt), so other users see `@key` on login and in the shell. `GlobalTranslationPipe` also falls back to `de_DE`.
- **Extension points for client-specific users features** (CSE, MBT, PDF):
  - The customers, allowed_types and clients tabs show buttons but have no routes.
  - `registerDynamicTab` reads `router.config[1]`, which is now the `''` redirect, so it throws (verified).
  - The multi-step create wizard is switched off (`main-wizard.component.ts:64` is commented out).
  - `componentOverrides` can only replace existing tab and wizard routes. It can't add tabs or replace the listing.
  - `ModuleCustomization.providers` is ignored.
  - **Decision needed:** CLAUDE.md says to use component overrides only, so extend them to add tabs and override the listing, and delete `registerDynamicTab`/`overwriteRoute`.
- **Client routes** (`client_routes` per organisation): `ClientRoutesService` exists, but no guard uses it.
- **Per-client branding:** the per-org logo (`user.attributes.organisationLogo`) is gone and the logo is hardcoded. Old per-client `themes/<client>/` folders (logo, login picture, favicon, theme.scss) have no equivalent. This is needed for the per-project template (section 7).
- **Per-module help text "?" popover:** the text is fetched but never shown.
- **Global user search:** it now matches email only, within your own org. Old matched first name, last name and email.
- **Organisation pickers** (users filter and orgs tab) load at most 1000 orgs, with no server-side paging.
- **Groups tab** no longer shows each group's roles and permissions.
- **Create user** defaults salutation to "Mr" (old: empty).
- **Search** navigates to `/main/search` on every keystroke, which destroys the current page state (old used an overlay).
- **TabPermissionsGuard** is missing. It will be needed when modules with permission-based tabs are ported.
- **Directives** `showWithPermissions` and `hasChannelAccess` are not ported (feature modules use them).
- **Shared widgets not ported**, needed by feature and project modules: angular-editor (rich text), date/time pickers, time-input, wizard, gauge, barplot, infinite scroll, keepHtml/numberFormat pipes and others. The **rich text editor matters for stoked's pages and blog.**

### C. Client-specific code inside the shared lib

This should move into project config, because each monorepo will configure its own juicebox:
- `projectTitle` checks for `'CSWP'`, `'QualityCircle'`, `'FireCircle'`, `'Equipments'`, `'CSJuicEcommerce'`, `'Kromer'` and `'Carl Stahl Configurator'` in the users listing, wizard, details and vendor dialog.
- Hardcoded dev API `https://staging.quality-circle.com` (`lib/environments/environment.development.ts:4`). `BaseAppConfig.apiUrl` is never read.
- The QC favicon and privacy-link switch based on the endpoint URL in login.
- The Carl Stahl channels tab (`carlstahl:channel`).

### D. Design: top fixes (details in section 5)

1. **Most ui-components never style their own host** (verified). Rules like `.app-button-raised` and `app-card { … }` in the component's own stylesheet can't match the host under emulated encapsulation; only `:host(...)` rules apply. Button variants, cards, sidenav, menu and list styles are dead. That's why every screen rebuilds its own buttons and cards.
2. **There are two token sources.** The shipped `lib/styles.scss` has a GitHub-like palette (`#0d1117`, `#ff6b35`). The zinc palette that matches the mockup is in `ui/styles/variables.scss`, and reaches the page only through 4 non-encapsulated components. The light theme lacks overrides for 12 tokens, and the `--color-*-rgb` tokens are undefined.
3. **Contrast fails WCAG AA:**
   - dark `text-secondary` = 4.09:1;
   - placeholders = 2.56:1;
   - light accent `#ff6b35`, as text and as white-on-orange buttons = 2.84:1;
   - `--color-warning` used as text = 1.8–2.2:1.
4. **Accessibility:**
   - `app-label` is not a `<label>` linked to its control, so almost no input has a label.
   - Icon-only buttons have no `aria-label`, and screen readers read the ligature text ("delete", "chevron_left").
   - Sidebar items are `<div (click)>`, which are not keyboard-reachable.
   - Tabs have no ARIA roles.
5. **Shell vs the mockup:**
   - top bar is 64px with a shadow (mockup: 48px with a border);
   - active nav item uses an orange gradient (mockup: flat with amber text);
   - the logo is a rotating PNG;
   - ⌘K is shown but does nothing.
6. **There are 4 table implementations and 4 dialog-header patterns.** Defects: a double close button in create-vendor, and `icon="colse"`, which renders the word "colse".
7. **Some screens were never migrated** (light-only or Bootstrap leftovers): reset-password, sidebar-user, wallets, channels alerts, the profile-picture dialog. The profile tabs' active underline is invisible in both themes.
8. **Responsiveness:** the sidebar is always docked (at 375px the content is about 155px wide). The table's `overflow-x:auto` is cancelled by `overflow:hidden`, so columns get clipped.

---

## 2. Core: old vs new (functionality)

| Behavior | Old | New | Status | Note |
|---|---|---|---|---|
| **Auth & session** | | | | |
| Startup: `config.json`, then validateToken, then getOptions | juicebox/services/JuiceboxFactory.ts:22 | lib/bootstrap.ts:146 | SAME | Dev endpoint is hardcoded to QC staging. `apiUrl` is unused. |
| Login: email/password, remember me, org picker, 2FA, legal agreement | juicebox/app/main/login/login.component.ts:104-194 | main/login/login.component.ts:121-220 | SAME | New adds a required-field check. |
| Enter submits login | button inside the form | submit button outside `<form>` | DIFFERENT (unsure) | |
| Login busy / double-click protection | `[promiseBtn]` | none | DIFFERENT | |
| Web3 wallet login | yes | commented out | MISSING | Looks intentional. |
| Post-login redirect | `replace('')` | `replace(returnUrl)` from AuthGuard | NEW / DIFFERENT | Deep-link return is new, but it ignores base-href (unsure). |
| Welcome message dialog | yes | yes | SAME | |
| 2FA setup warning after login | persistent toast | toast | DIFFERENT | Invisible because of the toast bug. |
| Forgot password | `users.forgotPassword` | stub, no request | MISSING | verified |
| Reset password `/reset-password?token=` | route + token check | no route, stub | MISSING | |
| Session polling `/juicebox/app/verify` | every 300 s | every 30 s | DIFFERENT | verified |
| Token refresh, 403 reload, logout | yes | yes | SAME | |
| TOTP setup / reset / confirm | yes | yes | SAME | |
| **Shell / navigation** | | | | |
| Route protection | `canActivateChild: [AuthGuard, ClientRouteGuard]` | `canActivate: AuthGuard` only | DIFFERENT | Child navigations are not re-checked. |
| Client routes per organisation | ClientRouteGuard | service exists, not wired | MISSING | |
| Landing route | first sidebar item; logout if none | `getFirstAccessibleRoute` | DIFFERENT | A user with no modules gets an empty shell. |
| 404 / unknown URL | not-found + `**` | none | MISSING | |
| TabPermissionsGuard | yes | none | MISSING | |
| Sidebar: role + visibility, per-user order, drag-reorder | yes | yes | SAME | Cached once per page load. |
| Exports sidebar role | `data-export:role` | `exports:role` | DIFFERENT | |
| Per-org logo | `organisationLogo` | hardcoded logo | MISSING | |
| Ctrl/Meta-click opens a new tab | yes | yes | SAME | |
| Page title, subject, back link | yes | yes, plus automatic header | SAME / NEW | |
| Action-button bar | yes | yes | SAME | No `[promiseBtn]`. |
| Per-module help text "?" | shown | fetched, not rendered | MISSING | |
| Help dialog (PDF, help text) | yes | yes | SAME | |
| Org switcher | yes | yes, plus search and sort | SAME / NEW | |
| **Search** | | | | |
| Global search | overlay, page stays | `/main/search?q=` route; navigates on every input | DIFFERENT | Destroys page state. ⌘K hint has no handler. |
| **Profile** | | | | |
| Name, password, wallet, country, language, 2FA | yes | yes | SAME | |
| "Next UI" toggle | yes | removed | MISSING | Intentional. |
| Profile back link | none | `/main/users` | DIFFERENT | Non-admins get a back link to Users. |
| **Language / i18n** | | | | |
| Language resolution | user, then default, then browser | user, then default, then localStorage, then browser, then en_GB | DIFFERENT | Browser language is not used after the first visit. Unsupported codes are not corrected. |
| Main dictionary | 10 languages | en_GB, de_DE | MISSING | |
| GlobalTranslationPipe fallback | current language | `de_DE` | DIFFERENT | |
| **Permissions** | | | | |
| `hasRole` / `hasPermission` | yes | yes (null-safe) | SAME | |
| `hasPermissions` directive | works on native elements | overwritten on app-button, ignored by app-checkbox | DIFFERENT | Section 1-A #3 |
| `NoPermissionDisable` | disables ng-select, ui-switch, pickers | native `disabled` only | DIFFERENT (unsure) | |
| `showWithPermissions`, `hasChannelAccess` | yes | absent | MISSING | |
| **Backend & errors** | | | | |
| `Juice.request`, requestBinary, HttpUtil | yes | yes | SAME | |
| Toasts | Toastr | snackbar duration bug; type/colour ignored | DIFFERENT | verified |
| 400 Missing Permission; 413 and status 0 | yes | yes | SAME | The 413/0 toasts do show; they call snackbar directly. |
| Socket.io, unsaved-changes guard service | yes | yes | SAME | |
| **New in the lib** | | | | |
| Light/dark theme saved to user settings | – | yes | NEW | |
| Config-driven modules, component overrides | generator + setup.json | `provideJuicebar` | NEW | |

**Core RPCs:** all `juicebox`, `juicebox:authentication:service`, `juicebox:organisations:service`, `juicebox:configuration:service` and `juicebox:totp` calls are present in both.
- Old only:
  - `users.forgotPassword`, `isForgotPasswordTokenValid` and `resetPassword` (defined in the new service but never called);
  - `juicebox:workflow:service`;
  - the `juicechain` asset methods (feature-only).

---

## 3. Users: listing, create flow, dialogs

| Behavior | Status | Note |
|---|---|---|
| Fetch scoped to the user's org; columns; default sort lastname asc; server-side sorting; page sizes 10/20/30/50; row click to details | SAME | |
| Shop login count/date merged into the listing | NEW | Client-side. |
| Sortable columns | DIFFERENT | New makes active, lastLogin and loginCount sortable. A third click sends an empty `prop`, and sorting by loginCount won't match the merged counts (unsure if the backend handles it). |
| Sort or filter change resets to page 1 | DIFFERENT | Improvement. |
| Row actions (login-as, delete) | DIFFERENT | Only after ticking the row's checkbox. |
| Empty state | DIFFERENT | New shows nothing (old: "No data to display"). |
| Delete with confirm, toast, refetch | SAME | |
| Column filters for first name, last name, email (500 ms debounce) | SAME | |
| Organisation filter | DIFFERENT | Old: paged infinite scroll. New: loads up to 1000 at once. |
| Role filter, group filter | SAME | |
| Global search provider | DIFFERENT | Email only, own org (old: name and email). Old role check `"users#role"` probably never matched (unsure). |
| Create: fields and validation | SAME | |
| Create: salutation default | DIFFERENT | "Mr" instead of empty. |
| Create: after success | DIFFERENT | Goes to the new user's details (old: back to the list). |
| Multi-step wizard (CSE/MBT steps) | MISSING | `checkForMultipleTabs()` is commented out. |
| QC/FireCircle create from trainee | DIFFERENT | Built into the wizard via `createUser` + `entity_id`, with no password step (old: `createUserFromTrainee` with a password). Backend support is unsure. |
| Groups modal, group name editor | SAME | |
| Login as another user (6-digit code, org picker, TOTP pre-check) | SAME | |
| Create vendor dialog | SAME | Nothing opens it in either app. |
| Permission strings on all actions | SAME | Enforcement is broken (section 1-A #3). |
| `addCustomActionButton` | SAME | |
| `registerDynamicTab` | DIFFERENT (broken) | verified |
| `overwriteRoute` | SAME | Moved to the service. |
| `componentOverrides` | NEW | Only for existing wizard and tab routes. It can't override the listing or add routes. |
| `ModuleCustomization.providers` | MISSING | Declared but ignored. |
| `users.extensions.module.ts` | NEW | Dead code with broken imports. |
| Hide "Create vendor" / "Create user from Trainee" per project | DIFFERENT | Precedence bug (section 1-A #5). |

**Users RPCs:** all 29 methods are the same (same service, method and argument order). Defined but never called in the new lib: `search`, `createUserFromTrainee`, and the three forgot/reset methods.

---

## 4. Users: details page and tabs

Tabs in both apps: details, organisations, roles, groups, sidebar, channels. `wallets-user` and `documents-user` are routes only; documents is a stub in both. The customers, allowed_types and clients tabs came from client extensions; they show buttons but have no routes in the new lib.

| Behavior | Status | Note |
|---|---|---|
| Tab visibility by permission and client | SAME | The clients tab check throws (section 1-A #4). |
| Extension tab routes (customers, allowed-types, clients) | MISSING | |
| Unsaved-changes guard | MISSING | |
| Header: avatar, name, email, breadcrumb | NEW | Not refreshed after saving the profile. |
| Details tab: fields, save, password rules and generator, 2FA reset, wallet address | SAME | Permission gate not enforced. |
| Wallets: list, add dialog | SAME | The list does not refresh after adding. |
| Roles: org picker, add/remove, permission checkboxes auto-save, visibility toggle | SAME | The German confirm text was dropped. Adds empty state and counts. |
| Groups: layout | DIFFERENT | Org tree × group checkbox grid with batch Save (old: per-org list, immediate save). |
| Groups: confirm before removing | MISSING | |
| Groups: error handling | DIFFERENT | Always shows a success toast. |
| Groups: show group roles/permissions | MISSING | |
| Sidebar tab (drag order, hide) | SAME | Both leave the spinner stuck if saving fails. |
| Organisations: list, add, delete | SAME | Delete permission changed from `users:role#roles` to `users:role#update`. |
| Organisations: picker | DIFFERENT | Loads at most 1000, client-side search. |
| Organisations: "Create" org shortcut | MISSING | Commented out ("broken on QC"); looks intentional. |
| Channels (Carl Stahl) | SAME | Gate not enforced. |
| Client-specific hides (orgs tab, nickname/department, email read-only) | SAME | |

**Details RPCs:** all are in both apps. `getAvailableOrganisations` is now called as (0, 1000, no filter) instead of paged with a name filter.

---

## 5. Design review vs direction A

**Verdict:** the shell and users screens clearly use direction A (zinc and orange palette, avatar and eyebrow page header, underline tabs, card forms, chips). The listing follows `direction-a (1).jsx`. Details, Orgs, Roles and the Groups modal are close to their mockups. The weaknesses are in the component and token foundation, accessibility and responsiveness.

### 5.1 Deviations from the mockups
- **Shell:**
  - top bar is 64px with a shadow (mockup: 48px with a 1px border);
  - logo is a 120px PNG that rotates when collapsed (mockup: logo mark + "Juicebox");
  - active nav item uses an orange gradient with a 3px bar (mockup: flat `#1a0f08` with amber text; the token `--color-secondary-active-bg` already exists);
  - nav items are 36px (mockup: 30px); collapsed width is 64px (mockup: 56px); no count badges;
  - top-bar icon buttons are 40px circles (mockup: 30px, radius 6);
  - the breadcrumb lacks the root crumb.
- **Listing:**
  - missing: subtitle, stats strip, All/Active/Inactive/Admins chips and compact filter buttons. Instead there are 300px dropdowns and inputs inside the column headers;
  - header style comes from v1, not (1); cell padding is 14/16px (mockup: 10/12px);
  - no avatar in the name cell; numeric columns are not right-aligned; email is blurred until hover;
  - no "rows per page" control (`pageSizeOptions` is never rendered); no select-all and no bulk bar;
  - title is 18px (mockup: 22px); all header buttons are raised (mockup: ghost Groups button).
- **Details:**
  - no status pill and no header Save/Cancel (saving is per card);
  - no tab count badges and no password-strength meter;
  - three different horizontal gutters (16, 32 and 28px).
- **Orgs:** the Create button is commented out, and the name column is not sortable.
- **Roles:** missing row description, Duplicate, "Add another role", and "Roles for <org>" in the header.
- **Groups modal:** no "Save & close"; 80% width up to 1200px (mockup: 760px); different panel colour and radius.
- **Dropdowns:** missing match count, query highlight, keyboard hints footer, and the multi-select chip strip with Apply/Clear all (unsure).

### 5.2 Consistency
- **Root cause:** host styles of ui-components don't apply (verified for button and card). Screens then hand-size buttons at 36, 40, 26, 20 and 48px.
- **4 table implementations:** `app-data-table`, the global `table.data-table`, copied `::ng-deep` blocks in orgs and roles, and the matrix in groups.
- **4 dialog-header patterns.** Defects: double close button in create-vendor; `icon="colse"`; `<div app-dialog-content>` does nothing.
- **Cards:** card and field styles are re-declared in details-user, user-profile-details and main-wizard.
- **Profile tabs:** they re-implement the tabs, and the active underline uses `--color-primary`, which makes it invisible in both themes.
- **Labels:** 3 different patterns.
- **States:** the data table has no empty, loading or error state (an empty list shows "1–0 of 0").
- **Destructive actions:** there is no destructive button style. Delete confirms use the orange primary, and `color="warn"` maps to blue.
- **Not migrated:** reset-password (white background, Bootstrap), sidebar-user, wallets, channels alerts, the profile-picture dialog.

### 5.3 Theming
- **Counts:** 18 files contain hardcoded colours: 24 hex, 12 named, 23 `rgba()`, 25 legacy `$vars`, 7 `lighten`/`darken`.
- **Worst files:** `lib/styles.scss`, `reset-password.component.scss`, `sidebar.component.scss:386-418`, `sidebar-user.component.scss`, `main.component.ts:22`.
- **Two palettes:** the shipped `styles.scss` (GitHub palette) and `ui/styles/variables.scss` (zinc, matches the mockup).
- **Light theme:** no overrides for secondary, tertiary and semantic colours. `--color-*-rgb` tokens are undefined. A second `:root` resets the shadows.
- **Undefined tokens:** `--background-color`, `--color-success-bg`, `--color-success-border`, `--color-success-rgb`.
- **Accent values don't agree:** `#f97316` in dark, `#ff6b35` in light, plus two different `$primary` values.

### 5.4 Design tokens
- **Spacing:** 799 px literals against 48 token uses; the token scale lacks the 6, 10, 12, 14, 20 and 28 steps.
- **Radius:** 23 distinct values.
- **Typography:** 22 font sizes. Inter is declared but never loaded.
- **Proposed scales:**
  - spacing: 4/6/8/10/12/16/20/28
  - radius: 4/6/8/12
  - text: 11/12/13/14/18/22
  - control heights: 26/32/36

### 5.5 Accessibility
- **Labels:** inputs and selects have no labels, and some inputs have only a placeholder.
- **Icon-only buttons** have no `aria-label`, and `app-icon` isn't `aria-hidden`.
- **Tooltips** work with the mouse only.
- **Clickable divs:** sidebar items, search results.
- **Tabs and pager:** no ARIA roles.
- **Unnamed toggles and checkboxes.**
- **Focus:** `app-button` has no `:focus-visible`.
- **Contrast:**
  - dark `text-secondary` 4.09:1 (suggest `#8b8b94`, which gives 5.9);
  - `text-disabled` 2.56:1;
  - light accent 2.84:1 (suggest `#c2410c`, which gives 5.2);
  - warning as text 1.8–2.2:1.

### 5.6 Responsiveness
- The sidebar is always docked (no off-canvas below 768px).
- Table overflow is clipped.
- The tabs header doesn't scroll (there can be up to 9 user tabs).
- Fixed widths: 300px filters, 400px sidebar-user.
- **Working well:** details-user, orgs and roles breakpoints, login, and full-screen dialogs at ≤600px.

### 5.7 Top 10 design fixes
1. Fix the ui-components host styles (`:host(.x)`), add `:focus-visible` and a red destructive variant, then delete the per-screen overrides.
2. Use one token source: merge `variables.scss` into the shipped `styles.scss`, drop the GitHub palette, and define all tokens in both themes.
3. Fix contrast at token level.
4. Label every form control: make `app-label` a real label and name the toggles and checkboxes.
5. Make icon-only buttons and tooltips accessible.
6. Rework the shell per the mockup: `<a routerLink>` nav items, logo mark, flat active state, 48px top bar, off-canvas on mobile, and a working ⌘K.
7. Make `app-data-table` the only table, with empty/loading/error slots, rows per page, select-all and a bulk bar.
8. Use one dialog anatomy, and fix "colse" and the double close button.
9. Rebuild the listing page head per mockup (1).
10. Migrate the leftover screens and remove legacy `$vars`, `lighten`/`darken` and inline styles.

---

## 6. What was checked by hand

The following were confirmed in code after the review:
- the `showToast` duration bug;
- the forgot-password stub;
- polling at 30000 ms vs 300000 ms;
- `registerDynamicTab` using `router.config[1]` (now the `''` redirect);
- the precedence bug at `user-listing.component.ts:143-144`;
- `hasPermission('pdf:role')` throwing;
- the app-button host `[disabled]` overriding `[hasPermissions]`;
- button and card styles not matching their hosts (emulated encapsulation).

Everything else comes from the review reading. Browser checks are still needed for the button/permission interaction, Enter-to-submit on login, and the base-href redirect.

---

## 7. Installing the lib in a new project (template)

**`npm install` alone can't, and shouldn't, set up a project.** Creating files from a `postinstall` script is discouraged, and it is often blocked (`--ignore-scripts`, security policies). The standard Angular way is an **`ng add` schematic shipped inside the lib**:

```bash
# inside a project monorepo, e.g. stoked/
ng new juicebox --style=scss --skip-git      # plain Angular app
cd juicebox
ng add @juicejs/juicebar                     # installs the lib and wires everything up
```

`ng add` would:
- install dependencies;
- set up `angular.json` (lib assets and styles);
- write `app.config.ts` with `provideJuicebar({...})`, `provideUsers()` and `provideExports()`;
- write the root component, `public/config.json` (API URL, authenticator) and logo/favicon placeholders;
- create an empty `src/modules/` folder for project modules.

A second schematic (`ng g @juicejs/juicebar:module pages`) could create a project module skeleton. That is also where synthesized modules would go later.

**What blocks this today (found during the review):**
- `projects/juicebar/package.json` is still the Angular 18 setup:
  - the name is `juicebar` (unscoped) at version 0.0.1;
  - peerDependencies are Angular `^18` plus `@angular/material ^18`, although the project is Angular 20 and has no Material;
  - there is no `"schematics"` field, and ng-packagr doesn't build the schematics folder;
  - the only schematic (`module`) is stale: it uses MatCard and the old `modules/` path.
- The lib imports `moment`, `ng2-dragula`, `ngx-image-cropper` and `socket.io-client` but declares only `tslib`. A fresh project won't get them; juicebox-app installed them by hand.
- The host app still needs Material leftovers: the `rose-red.css` prebuilt theme, the Material Icons font, the `mat-typography` body class, and Roboto. It also needs a `global = window` polyfill and the odd styles path `node_modules/juicebar/src/lib/styles.scss`.
- The dev API is hardcoded to QC staging, and `apiUrl` is ignored.
- There is nothing for per-project branding (logo, login picture, favicon, colours). Old juicebox had `themes/<client>/`.
- Distribution: today the lib is a `file:` link. It should be published as a versioned package, e.g. `@juicejs/juicebar`, next to the existing `@juicejs/*` backend packages.

**Recommended direction:** move as much as possible into the lib so the template stays tiny:
- the lib declares its own dependencies;
- one styles entry;
- the lib handles the polyfill;
- the API URL comes from `config.json` / `provideJuicebar`;
- branding comes from config plus CSS tokens.

A project's `juicebox/` folder should then be about 6 files plus its own modules:

```
juicebox/
├── package.json        (@juicejs/juicebar + Angular)
├── angular.json
├── public/config.json  + logo, favicon
└── src/
    ├── main.ts
    ├── styles.scss     (brand tokens only)
    ├── app.config.ts   (provideJuicebar + enabled modules)
    └── modules/        (project modules: pages, blog, …)
```

For developing the lib itself, a small host app inside the lib workspace (e.g. `projects/playground`) created by the same `ng add` would replace juicebox-app. It also tests the template on every change.
