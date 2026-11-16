# @juicejs/juicebar

The Juicebox admin for Angular 22: app shell (login, sidebar, search, profile), modules a project switches on (users, exports, locations, categories, communications, configurations), and CDK-based UI components. Each project's monorepo has its own small `juicebox/` app that installs this package and adds the project's own modules.

## New project

`@juicejs` packages are on GitHub Packages. Each developer (and the build server) needs a GitHub token with
`read:packages` from someone with access to `juicejs/juicebox-lib`, and these two lines in `~/.npmrc` (on a build server,
the token from a secret, e.g. `${NODE_AUTH_TOKEN}`; never commit the token):

```
@juicejs:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=<token>
```

Then one command creates the admin, in the project monorepo:

```bash
npx -p @angular/cli@22 -p @juicejs/juicebar@beta ng new juicebox --collection @juicejs/juicebar
```

It is Angular's `ng new` (SCSS, no server-side rendering) with the admin set up in it, and it asks nothing. It installs
the packages but leaves git alone: no repository, no commit. `ng serve`
talks to the backend at `http://localhost:3000` (`--api-url` sets another); production builds read the backend's URL
from `config.json`, which the deploy writes. The app gets:

- `src/main.ts` bootstrapping `JuicebarComponent`, and `src/app/app.config.ts` calling `provideJuicebar(...)` without
  any module; the placeholder root component is removed;
- `@juicejs/juicebar` at the same version, and an `.npmrc` that names its registry (without a token);
- in `angular.json`, the lib styles and assets (with the rich-text editor's icons in `assets/ae-icons/`), output straight
  into `dist/` and a larger bundle budget;
- `public/config.json`;
- `PROJECT_README.md` as its `README.md`, in place of Angular's: everything on using the lib is in the project.

Version 1 is in beta, so the app pins the exact beta; a later one is `npm install @juicejs/juicebar@1.0.0-beta.N --save-exact`.

An app made with a plain `ng new juicebox --style=scss --ssr=false` gets the same with `ng add @juicejs/juicebar@beta`
(with the `.npmrc` line in the app first).

The admin starts with the shell only (login, top bar, sidebar, profile). The project adds the lib's modules it uses
(`provideUsers()`, `provideExports()`, `provideLocations()`, `provideCategories()`, `provideCommunications()`,
`provideConfigurations()`) and its own (`ng g @juicejs/juicebar:module …`, below). Until it has one the user may open,
signing in ends in a logout, as in the old juicebox for a user without modules.

Your project's `juicebox/` folder is then mostly `app.config.ts`, `styles.scss`, `config.json` and your own modules.

## Using it in a project

`PROJECT_README.md` (in the package, and the `README.md` of every admin made with `ng new` or `ng add`) has everything
a project needs: running it, the lib's modules and every option, the project's own modules, configuration, theme,
sidebar numbers, overrides, phones, build and deploy, and updating the lib. `MODULE_GUIDE.md` says how a module is
built.

## Development (in this repository)

Use Node 24: the Angular 22 CLI needs Node 22.22.3+ or 24.15+.

| Command | What it does |
|---|---|
| `npm start` | Serves the playground app (`projects/playground`) with the lib from source |
| `npm run build` | Builds the package and its schematics into `dist/juicebar` |
| `npm run publish:lib` | Builds the package and publishes it to GitHub Packages (needs a token with `write:packages`) |

A new module of the library starts from the same generator, with `--lib`: `npm run build:schematics`, then `npx ng g ./dist/juicebar/schematics/collection.json:module <name> --lib`. It also wires the module into the config, the sidebar, `public-api.ts` and the playground. A module ported from the old juicebox keeps its old address and sidebar id with `--route <old address>`. `MODULE_GUIDE.md` says how a module is built.

Raise `version` in `projects/juicebar/package.json` before publishing.
