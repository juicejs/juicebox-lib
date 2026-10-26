# Component Customization Guide

This guide explains how consuming apps can customize and extend juicebox library components.

## Overview

The juicebox library exposes three provider functions:

- `provideJuicebar(config)` — core setup (routing, HTTP, DI)
- `provideUsers(customization?)` — opt-in users module with optional overrides
- `provideExports(customization?)` — opt-in exports module with optional overrides

Calling `provideUsers()` or `provideExports()` is how you enable a module. Not calling them disables the module entirely — no routes, no sidebar entry, no providers.

## Basic Setup

`provideUsers()` and `provideExports()` are passed as feature arguments directly into `provideJuicebar()`. This enables true lazy loading — modules not passed are excluded from the bundle entirely.

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideJuicebar, provideUsers, provideExports } from 'juicebar';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideJuicebar(
      {
        apiUrl: environment.apiUrl,
        appName: 'My App',
        modules: [],
      },
      provideUsers(),
      provideExports(),
    ),
  ],
};
```

## Disabling a Built-in Module

Simply omit the feature argument:

```typescript
provideJuicebar(
  { apiUrl, appName, modules: [] },
  provideUsers(),
  // provideExports() omitted — zero exports code in the bundle
),
```

No routes, no sidebar item, no providers for that module.

## Component Overrides

Pass a `componentOverrides` array to replace built-in route components with your own:

```typescript
import { CustomGroupsUserComponent } from './custom-components/custom-groups-user.component';

provideJuicebar(
  { apiUrl, appName, modules: [] },
  provideUsers({
    componentOverrides: [
      {
        routePath: ['details/:id', 'groups-user'],
        component: CustomGroupsUserComponent,
      },
    ],
  }),
  provideExports(),
),
```

When a user navigates to `/main/users/details/123/groups-user`, your component renders instead of the built-in one.

## Multiple Overrides

```typescript
provideUsers({
  componentOverrides: [
    {
      routePath: ['details/:id', 'groups-user'],
      component: CustomGroupsUserComponent,
    },
    {
      routePath: ['details/:id', 'details-user'],
      component: CustomUserDetailsComponent,
    },
  ],
}),
```

## Adding Tabs and Wizard Steps

A `routePath` that does not exist yet is **added** under its parent. With `tab`, it also shows up as a tab on the parent page: the users details tab bar (`['details/:id', …]`) or the create-user wizard (`['user-wizard', …]`, after the main step, which then shows "Next" instead of "Create").

```typescript
provideUsers({
  componentOverrides: [
    // replace the listing
    { routePath: [''], component: CseUserListingComponent },
    // new details tab, only for users with the permission
    {
      routePath: ['details/:id', 'customers-user'],
      component: CustomersUserComponent,
      tab: { label: 'customers', permission: 'customers:role#read' },
    },
    // tab that needs a permission and a role
    {
      routePath: ['details/:id', 'clients-user'],
      component: PdfUsersClientsComponent,
      tab: { label: 'clients', permission: 'clients:role#super-admin', role: 'pdf:role' },
    },
    // extra wizard step; it receives the main step's form values via router state
    {
      routePath: ['user-wizard', 'customers'],
      component: UserWizardCustomersComponent,
      tab: { label: 'customers', permission: 'customers:role#read' },
    },
  ],
  // services the override components need
  providers: [CustomersService],
}),
```

`tab.label` is a users translation key or plain text. Added tabs come after the built-in ones, in the order they are listed. A `routePath` whose parent does not exist throws at startup.

## Route Path Reference

### Users Module

| Route | `routePath` |
|---|---|
| User listing | `['']` |
| User details form | `['details/:id', 'details-user']` |
| User documents | `['details/:id', 'documents-user']` |
| User wallets | `['details/:id', 'wallets-user']` |
| User roles | `['details/:id', 'roles-user']` |
| User groups | `['details/:id', 'groups-user']` |
| User organisations | `['details/:id', 'organisations-user']` |
| User channels | `['details/:id', 'channels-user']` |
| User sidebar | `['details/:id', 'sidebar-user']` |
| User wizard | `['user-wizard', 'main']` |

### Exports Module

| Route | `routePath` |
|---|---|
| Template listing | `['']` |
| Create template | `['create']` |
| Edit template | `['edit/:id']` |

## Adding Custom Top-level Routes

Pass `mainRoutes` to `provideJuicebar` to add routes under `/main` with sidebar entries:

```typescript
provideJuicebar({
  apiUrl: environment.apiUrl,
  appName: 'My App',
  modules: [],
  mainRoutes: [
    {
      path: 'trainings',
      loadChildren: () => import('./trainings/trainings.module').then(m => m.TrainingsModule),
      navigation: {
        label: 'Trainings',
        icon: 'school',
        role: 'trainings:role',
      },
    },
  ],
}),
```

## Technical Notes

- Overrides are applied to the module's route config when `provideUsers()` / `provideExports()` builds it (`applyComponentOverrides` in `config/route-customization.ts`). There is no runtime route patching; the old `UsersService.overwriteRoute()` / `registerDynamicTab()` were removed.
- A replaced route keeps its guards and child routes; only the component changes.
- The sidebar registers entries only for modules whose provider was called — detected via `USERS_CUSTOMIZATION` / `EXPORTS_CUSTOMIZATION` injection tokens
