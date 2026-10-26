# @juicejs/juicebar

The Juicebox admin for Angular 20: app shell (login, sidebar, search, profile), the users and exports modules, and CDK-based UI components. Each project's monorepo has its own small `juicebox/` app that installs this package and adds the project's own modules.

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
- `angular.json` gets the lib styles and assets, builds into `dist/` and allows a larger bundle;
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
    mainRoutes: [                        // project modules inside the shell
      {
        path: 'pages',
        loadChildren: () => import('./modules/pages/pages.routes'),
        navigation: { label: 'pages', role: 'pages:role', icon: 'article' },
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

**Modules.** Leaving out `provideUsers()` or `provideExports()` removes that module completely: no routes, no menu entry, no code in the bundle.

**Users options.** These replace the old checks on the project name:

| Option | Effect |
|---|---|
| `hiddenFields: ['nickname', 'department']` | Hides these fields in the create wizard, user details and the vendor dialog |
| `readonlyFields: ['email']` | Makes email read-only on user details |
| `hidePassword: true` | Hides the password section on user details |
| `hideOrganisationsTab: true` | Hides the organisations tab |
| `createFromTrainees: true` | The create wizard picks the email from trainees that have no user profile yet |

**Overrides.** `componentOverrides` can do three things:

- replace a built-in screen;
- add a tab to user details;
- add a step to the create-user wizard.

See `COMPONENT_CUSTOMIZATION_GUIDE.md` in the repository.

## Development (in this repository)

| Command | What it does |
|---|---|
| `npm start` | Serves the playground app (`projects/playground`) with the lib from source |
| `npm run build` | Builds the package and its schematics into `dist/juicebar` |
| `npm run publish:lib` | Builds the package and publishes it to GitHub Packages (needs a token with `write:packages`) |

Raise `version` in `projects/juicebar/package.json` before publishing.
