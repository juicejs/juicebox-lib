# Juicebox admin

This project's admin, built on `@juicejs/juicebar`: the Juicebox admin for Angular 22. The lib gives the shell (login,
top bar with search, organisation switcher and profile, sidebar), modules the project switches on, and CDK-based UI
components; the project adds its own modules.

This README comes with the package and was copied in when the admin was set up. The package's own copy, for the
version installed, is `node_modules/@juicejs/juicebar/PROJECT_README.md`; the project may make this file its own.

## Run it

Node 22.22.3 or newer (or 24) is needed by the Angular 22 CLI.

`@juicejs` packages are on GitHub Packages. The project's `.npmrc` names the registry; installing also needs a GitHub
token with `read:packages`, of someone with access to `juicejs/juicebox-lib`, in your `~/.npmrc` (never in the
project; on a build server, from a secret such as `${NODE_AUTH_TOKEN}`):

```
@juicejs:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=<token>
```

```bash
npm install
npm start          # http://localhost:4200
npm run build      # into dist/
```

`npm start` talks to the backend set as `apiUrl` in `src/app/app.config.ts`. A production build reads the backend's
URL from `config.json` instead (see Build and deploy).

## Modules

Everything is set in `src/app/app.config.ts`: the lib's modules after the config, the project's own in `mainRoutes`.
A module's sidebar entry shows to users whose role has its sidebar role. With no module the user may open, signing in
ends in a logout, as in the old juicebox for a user without modules.

```ts
provideJuicebar(
  {
    apiUrl: 'http://localhost:3000',
    appName: 'My admin',
    mainRoutes: [
      {
        path: 'orders',
        loadChildren: () => import('./modules/orders/orders.routes'),
        navigation: { label: 'Orders', role: 'orders:role', icon: 'shopping_cart' },
      },
    ],
    modules: [],
  },
  provideUsers(),
  provideLocations({ options: { ownerFilter: true } }),
),
```

### The lib's modules

A module left out has no routes, no sidebar entry and no code in the bundle.

| Add | The module (old juicebox name) | Address | Sidebar role |
|---|---|---|---|
| `provideUsers()` | Staff accounts: the list with organisation, role and group filters, the create wizard, and a user's details, documents, wallets, roles, channels, groups, sidebar and organisations (`users`) | `/main/users` | `users:role` |
| `provideExports()` | Export templates (data source, columns, filters) and their exports to Excel or PDF (`exports`) | `/main/exports` | `data-export:role` |
| `provideLocations()` | Locations: the list, a wizard, and a location's details, attributes, media, documents and seating layout (`location`) | `/main/location` | `locations:role` |
| `provideCategories()` | The category tree, a wizard, and a category's details, media and articles (`categories`) | `/main/categories` | `categories:role` |
| `provideCommunications()` | E-mail and push: quick send, contents, automations, history (`communications`) | `/main/communications` | `communication:role` |
| `provideConfigurations()` | The backend's configurations in memory and in the database: compared, added, changed and deleted (`configuration`) | `/main/configuration` | `configuration:role` |
| `provideEntities()` | Customers: the list by type with column, organisation and attribute filters, customer groups, the create page, and a customer's details, addresses, attributes, wallets, files, e-mail history, push notifications, and an organisation's payment and API keys (`entities`) | `/main/entities` | `entities:role` |

Each takes `{ options, componentOverrides, providers }`, all optional: `options` below, `componentOverrides` under
Overrides, and `providers` for services the override components need. The editor shows each option's description too.

**Users** — `provideUsers({ options: { … } })`; these replace the old checks on the project name:

| Option | Effect |
|---|---|
| `hiddenFields: ['nickname', 'department']` | Hides these fields in the create wizard, user details and the vendor dialog |
| `readonlyFields: ['email']` | Makes email read-only on user details |
| `hidePassword: true` | Hides the password section on user details |
| `hideOrganisationsTab: true` | Hides the organisations tab |
| `createFromTrainees: true` | The create wizard picks the email from trainees that have no user profile yet, and links the trainee |

**Exports**

| Option | Effect |
|---|---|
| `hiddenFilters: [{ filter, permission, unless? }]` | Filters some users don't see, e.g. `{ filter: 'show_modules', permission: 'modules:role#mine-only', unless: 'modules:role#super-admin' }`; the filter keeps its value, it is only not shown |
| `downloadTimeoutMs: 90000` | An export taking longer is cancelled with a message; without it, a download waits |

**Locations**

| Option | Effect |
|---|---|
| `hiddenTabs: ['attributes', 'documents']` | Details tabs the project doesn't use; they show by default |
| `fields: ['email', 'accessibility', 'coordinates']` | Fields beyond the standard ones: the location's email (stored as `attributes.email`), accessibility, and coordinates entered by hand (used instead of looking up the address) |
| `emailHint: '…'` | Shown under the email field (a translation key or text) |
| `shortNameMaxLength: 19` | The longest short name accepted |
| `ownerFilter: true` | A "Show locations: All / Mine / Public" switch on the list: every location, the user's organisation's, or other organisations'. It filters the page shown, not the whole list |
| `archivableTypes: ['web', 'geo']` | Location types (their `value`) that can be archived and unarchived from the list; none by default |
| `deletableTypes: ['region', 'web']` | Location types that can be deleted from the list; `['region']` by default |

**Categories**

| Option | Effect |
|---|---|
| `showInactive: true` | A "Show inactive" switch on the list; the tree then also has the inactive categories |
| `confirmDeactivation: true` | Asks before deactivating a category and tells what still uses it (the backend's `category:usage:service`) |
| `subcategoriesActive: true` | New subcategories are active unless switched off; otherwise they start inactive |

The backend's `juicecommerce:categories` configuration also has a say: `allowDelete`, `allowRootDelete`, `showPublic`
and `openCategoriesInNewTab`.

**Communications** has no options: the backend's `communications:tabs`, `amgshop` and `communications` configurations
switch its parts.

**Configurations** has no options.

**Customers**

| Option | Effect |
|---|---|
| `hiddenTabs: ['wallets']` | Tabs of a customer this project does not use: `attributes`, `wallets`, `push-notifications`, `payment`. They show by default (Payment for organisations only) |
| `extraTabs: ['media', 'api-access']` | Tabs only some projects use, hidden by default: the customer's files, and an organisation's API keys (for staff with `superAdmin:role`) |

The old juicebox chose these tabs by the project's title; a project now names them. Its other modules' tabs on a
customer (tickets, purchases, bookings …) are added with `componentOverrides`: `{routePath: ['details/:id', 'tickets'],
component, tab: {label: 'tickets', permission: 'ticket-management:role#admin'}}`. The backend's `amgshop` configuration
switches the calling-number fields, the "Customer group" column and the listing buttons other modules register with
`EntitiesService.addCustomActionButton()`; `entities:juicebox:settings` gives the customer types and their columns.

Three pages of the old juicebox that no tab leads to are still there for projects that link to them:
`details/:id/documents-entity` (the files a customer sent with a form), `details/:id/addlogo-entity` (the customer's
images) and `details/:id/prices-entity` (a placeholder; a project with prices overrides it).

### The project's own modules

The generator writes a module in the lib's shape (listing with the split view, record page, create dialog, service,
labels) into `src/app/modules/<name>/` and adds its entry to `mainRoutes`:

```bash
ng g @juicejs/juicebar:module orders --label "Orders" --role orders:role --service orders --icon shopping_cart
```

`--label` is what staff read (default: the name, capitalised), `--role` shows it in the sidebar (default
`<name>:role`), `--service` is the backend service it calls (default: the name), `--icon` a Material icon name
(default `label`), `--route` the address under `/main/` and its sidebar id (default: the name), `--path` where it goes
(default `src/app/modules`).

`node_modules/@juicejs/juicebar/MODULE_GUIDE.md` says how a module is built and what to check before it is done. The
generator also adds a Claude skill (`.claude/skills/juicebar-module`) that points to it.

A `mainRoutes` entry has `path` (the address `/main/<path>`, also its sidebar id), `loadChildren` (or `component` for a
single screen), optional `guards`, and `navigation: { label, role, icon }` for its sidebar entry; without `navigation`
it has none but can still be opened by its address. `modules` takes entries of the same shape for pages outside the
shell (no top bar or sidebar), which need a login unless they have `guards` of their own.

## Configuration

```ts
provideJuicebar(
  {
    apiUrl: 'http://localhost:3000',    // backend for `npm start`
    appName: 'My admin',
    loginLanguage: 'en_GB',             // login page language; de_DE unless set (the old setup.json's login_language)
    authenticator: 'juicebox:cse:user', // optional login authenticator
    privacyPolicyLink: 'https://…',     // optional; translation key or URL
    theme: { primary: '#243088' },      // optional; see Theme
    sidebarCount: { … },                // optional; see Sidebar numbers
    mainRoutes: [ … ],                  // the project's modules
    modules: [],                        // pages outside the shell
  },
  // the lib's modules
)
```

**Theme.** `theme` replaces the old juicebox `themes/<project>` folder. Every field is optional; without `theme` the
admin is juice orange with the juice logo.

```ts
theme: {
  primary: '#243088',                     // the old theme.scss $primary
  logo: 'assets/logo_small.png',          // sidebar and login page
  loginImage: 'assets/login_picture.png', // picture behind the login card
  favicon: 'assets/favicon.ico',
}
```

- `primary` colours the main buttons, the active sidebar item, tabs, links, checkboxes and focus rings. The lib works
  out the shades for light and dark mode, and darkens or lightens the colour where needed so the text on it stays
  readable (WCAG AA).
- A user's `attributes.organisationLogo` still replaces the logo in the sidebar.
- The files go in the project's `public/` folder, like the old `themes/<project>/images`.
- The title comes from `config.json`'s `title` (login) and the backend's juicebox options.

**Sidebar numbers.** `sidebarCount` puts a number next to the modules' names in the sidebar. The project answers it;
the lib only shows it:

```ts
sidebarCount: {
  // Gets the sidebar ids of the modules the user sees; may use inject(); answers a map, a Promise or an Observable of it
  getSidebarCount: (moduleIds) => inject(Juice).request('myproject', 'getSidebarCount', [moduleIds]),
  refresh: 'navigation',  // default: read again after every page change; 'load' reads them only when the sidebar loads
}
```

The answer is `{ <sidebar id>: number }`: `users`, `exports`, `location`, `categories`, `communications`,
`configuration`, or a project module's `path`. A module that is left out (or gets `null`) shows no number, and without
`sidebarCount` the sidebar has none. `inject(SidebarService).refreshCounts()` reads them again at any time, e.g. after
the project's own screen changed something.

## Overrides

`componentOverrides` on a lib module can replace one of its screens, add a tab, or add a route:

```ts
provideUsers({
  componentOverrides: [
    // replace a screen
    { routePath: ['details/:id', 'groups-user'], component: MyGroupsUserComponent },
    // a new details tab, only for users with the permission (and the role, if given)
    {
      routePath: ['details/:id', 'customers-user'],
      component: CustomersUserComponent,
      tab: { label: 'customers', permission: 'customers:role#read', role: 'pdf:role' },
    },
    // an extra step of the create-user wizard; it gets the main step's form values through the router state
    {
      routePath: ['user-wizard', 'customers'],
      component: UserWizardCustomersComponent,
      tab: { label: 'customers', permission: 'customers:role#read' },
    },
  ],
  providers: [CustomersService],   // services the override components need
}),
```

- `routePath` is the route inside the module, one entry per level. An existing route gets the component (its guards
  and child routes stay); a new last segment is added under its parent. A path whose parent doesn't exist stops the
  admin at startup with an error naming it.
- With `tab`, an added route shows as a tab: on a user's details (`['details/:id', …]`), as a step of the create-user
  wizard (`['user-wizard', …]`, after the main step, which then says "Next" instead of "Create"), and on a category's
  details (`['details/:id', …]` in categories). `tab.label` is a translation key of the module or plain text; added
  tabs come after the module's own, in the order listed.
- Replacing a module's list (`['']`) leaves out the compact list next to an open record (the split view): the project's
  list doesn't know it.

| Module | `routePath`s |
|---|---|
| Users | `['']` list; `['user-wizard', 'main']` create wizard; `['details/:id', 'details-user']`, `'documents-user'`, `'wallets-user'`, `'roles-user'`, `'channels-user'`, `'groups-user'`, `'sidebar-user'`, `'organisations-user'` |
| Exports | `['']` list; `['create']`; `['edit/:id']` |
| Locations | `['']` list; `['location-wizard']`; `['details/:id', 'details-location']`, `'attributes-location'`, `'location-media'`, `'location-documents'`, `'seating-layout-location'` |
| Categories | `['']` tree; `['category-wizard']`; `['details/:id', 'details-category']`, `'media-category'`, `'included-articles-category'` |
| Communications | `['send']`; `['contents', '']`, `['contents', 'details/:id']`; `['automation', '']`, `['automation', 'details/:id']`; `['history']` |
| Configurations | `['']` list |

## Phones

At 768px and below the admin is laid out for a phone, and the project's own modules follow without code: an
`app-data-table` shows its rows as a list, a dialog takes the whole screen, a filter takes the whole line. Where the
project's code has a say:

- In a template or a component, `inject(ViewportService).phone()` says whether the screen is a phone's (a signal).
- In the project's styles: `@use '@juicejs/juicebar/breakpoints' as juicebar;`, then `@include juicebar.phone { … }`.
- A small dialog (a question, a notice) stays a card: `dialog.open(Component, { phone: 'card' })`.
- A table whose first column is not the row's name, or whose actions column has another key than `actions`, says so
  with `listRole` on the column.
- The data table's own texts (rows per page, sort, no data…) are translated by the lib; a project that wants other
  words provides `DATA_TABLE_LABELS`.
- An e-mail with `class="hidden-email"` is shown by a tap on a touch screen, as it is by the pointer elsewhere.

`src/index.html` needs `<meta name="viewport" content="width=device-width, initial-scale=1">`, which the Angular CLI
writes.

## Build and deploy

`npm run build` writes the admin into `dist/`, `index.html` at its top. A production build reads `config.json` next to
`index.html`, which the deploy writes:

```json
{ "url": "https://api.example.com" }
```

- `"url": "auto"` means the API is on the admin's own domain (`public/config.json` starts with it).
- `config.json` can also set `authenticator` and the login page's `title`.

## Updating the lib

The version in `package.json` is pinned. Another one: `npm install @juicejs/juicebar@<version> --save-exact`;
`npm view @juicejs/juicebar dist-tags` shows the newest. The new version's `PROJECT_README.md` in `node_modules` tells
what it offers; this file stays as it was.
