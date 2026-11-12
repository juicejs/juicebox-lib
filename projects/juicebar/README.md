# @juicejs/juicebar

The Juicebox admin for Angular 22: app shell (login, sidebar, search, profile), the users and exports modules, and CDK-based UI components. Each project's monorepo has its own small `juicebox/` app that installs this package and adds the project's own modules.

## New project

```bash
# in the project monorepo
ng new juicebox --style=scss --ssr=false
cd juicebox
ng add @juicejs/juicebar
```

The registry for `@juicejs` packages is GitHub Packages, so the project needs an `.npmrc`:

```
@juicejs:registry=https://npm.pkg.github.com
```

`ng add` sets up the new app:

- `src/main.ts` bootstraps `JuicebarComponent`, and `src/app/app.config.ts` calls `provideJuicebar(...)` with users and exports;
- `angular.json` gets the lib styles and assets (with the rich-text editor's icons in `assets/ae-icons/`), builds into `dist/` and allows a larger bundle;
- `public/config.json` is created;
- the placeholder root component is removed.

Your project's `juicebox/` folder is then mostly `app.config.ts`, `styles.scss`, `config.json` and your own modules.

## Configuration

```ts
provideJuicebar(
  {
    apiUrl: 'http://localhost:3000',   // backend for `ng serve`
    appName: 'Stoked admin',
    authenticator: 'juicebox:cse:user', // optional login authenticator
    privacyPolicyLink: 'https://…',     // optional; translation key or URL
    loginLanguage: 'de_DE',             // optional; login page language (setup.json's login_language), default de_DE
    theme: { primary: '#243088' },      // optional; see Theme below
    sidebarCount: {                     // optional; see Sidebar numbers below
      getSidebarCount: () => inject(Juice).request('myproject', 'getSidebarCount', []),
    },
    mainRoutes: [                        // project modules inside the shell
      {
        path: 'pages',
        loadChildren: () => import('./modules/pages/pages.routes'),
        // label is shown as written; icon is a Material icon name
        navigation: { label: 'Pages', role: 'pages:role', icon: 'article' },
      },
    ],
    modules: [],                         // routes outside the shell
  },
  provideUsers({ options: { hiddenFields: ['department'] } }),
  provideExports(),
)
```

**Backend URL.** `ng serve` uses `apiUrl`. Production builds read `config.json` next to `index.html`, which the deploy pipeline writes:

```json
{ "url": "https://api.example.com" }
```

- `"url": "auto"` means the API is on the same origin as the admin.
- `config.json` can also set `authenticator`.

**Sidebar numbers.** `sidebarCount` puts a number next to the modules' names in the sidebar. The project answers it; the lib only shows it:

```ts
sidebarCount: {
  // Gets the sidebar ids of the modules the user sees; may use inject(); answers a map, a Promise or an Observable of it
  getSidebarCount: (moduleIds) => inject(Juice).request('myproject', 'getSidebarCount', [moduleIds]),
  refresh: 'navigation',  // default: read again after every page change; 'load' reads them only when the sidebar loads
}
```

The answer is `{ <sidebar id>: number }`: `users`, `exports`, `location`, `categories`, `communications`, or a project module's `path`. A module that is left out (or gets `null`) shows no number, and without `sidebarCount` the sidebar has none. `inject(SidebarService).refreshCounts()` reads them again at any time, e.g. after the project's own screen changed something.

**Modules.** Leaving out `provideUsers()` or `provideExports()` removes that module completely: no routes, no menu entry, no code in the bundle.

**Users options.** These replace the old checks on the project name:

| Option | Effect |
|---|---|
| `hiddenFields: ['nickname', 'department']` | Hides these fields in the create wizard, user details and the vendor dialog |
| `readonlyFields: ['email']` | Makes email read-only on user details |
| `hidePassword: true` | Hides the password section on user details |
| `hideOrganisationsTab: true` | Hides the organisations tab |
| `createFromTrainees: true` | The create wizard picks the email from trainees that have no user profile yet |

**Theme.** `theme` replaces the old juicebox `themes/<project>` folder. Every field is optional; without `theme` the admin is juice orange with the juice logo.

```ts
theme: {
  primary: '#243088',                  // the old theme.scss $primary
  logo: 'assets/logo_small.png',       // sidebar and login page
  loginImage: 'assets/login_picture.png', // picture behind the login card
  favicon: 'assets/favicon.ico',
}
```

- `primary` colours the main buttons, the active sidebar item, tabs, links, checkboxes and focus rings. The lib works out the shades for light and dark mode, and darkens or lightens the colour where needed so the text on it stays readable (WCAG AA).
- A user's `attributes.organisationLogo` still replaces the logo in the sidebar.
- The files go in the project's `public/` (or assets) folder, like the old `themes/<project>/images`.
- The title still comes from `config.json` `title` (login) and the backend's juicebox options.

**Overrides.** `componentOverrides` can do three things:

- replace a built-in screen;
- add a tab to user details;
- add a step to the create-user wizard.

See `COMPONENT_CUSTOMIZATION_GUIDE.md` in the repository.

**Phones.** At 768px and below the admin is laid out for a phone, and a project's own modules follow without code: an `app-data-table` shows its rows as a list, a dialog takes the whole screen, a filter takes the whole line. Where a project's code has a say:

- In a template or a component, `inject(ViewportService).phone()` says whether the screen is a phone's (a signal).
- In the project's styles: `@use '@juicejs/juicebar/breakpoints' as juicebar;`, then `@include juicebar.phone { … }`.
- A small dialog (a question, a notice) stays a card: `dialog.open(Component, { phone: 'card' })`.
- A table whose first column is not the row's name, or whose actions column has another key than `actions`, says so with `listRole` on the column.
- The data table's own texts (rows per page, sort, no data…) are translated by the lib; a project that wants other words provides `DATA_TABLE_LABELS`.
- An e-mail with `class="hidden-email"` is shown by a tap on a touch screen, as it is by the pointer elsewhere.

The project's `index.html` needs `<meta name="viewport" content="width=device-width, initial-scale=1">`, which the Angular CLI writes by default.

## Development (in this repository)

Use Node 24: the Angular 22 CLI needs Node 22.22.3+ or 24.15+.

| Command | What it does |
|---|---|
| `npm start` | Serves the playground app (`projects/playground`) with the lib from source |
| `npm run build` | Builds the package and its schematics into `dist/juicebar` |
| `npm run publish:lib` | Builds the package and publishes it to GitHub Packages (needs a token with `write:packages`) |

Raise `version` in `projects/juicebar/package.json` before publishing.
