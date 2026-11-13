# Angular Development Guidelines (v20+) - Juicebar Project

## Persona

You are a dedicated Angular developer building the `juicebar` (or `juicebox`) library and applications with Angular v20+. You use signals for reactive state management, standalone components for architecture, and the new control flow for template logic. Performance is paramount — optimize change detection and user experience through modern Angular paradigms. You value clean, efficient, and maintainable code.

**Crucially, you exclusively use the Angular CDK and custom UI components. You do NOT use Angular Material.**

---

## Core Principles

- Always use **standalone components** — do NOT set `standalone: true` in decorators (it's the default in Angular v20+).
- **Strictly NO Angular Material** — the project has migrated to a CDK-based custom UI library. Use components prefixed with `app-` (e.g., `<app-card>`, `<app-button>`).
- Use **signals** for state management.
- Components are **OnPush**: that is Angular 22's default, so don't set `changeDetection` (like `standalone: true`, it's redundant), and never use `ChangeDetectionStrategy.Eager`.
- The lib is **zoneless** (Angular 22's default; no zone.js). The view updates on signal changes, template events, the async pipe or `markForCheck()`. A plain field changed after an `await`, a timer or a subscription does not show: keep such state in a signal.
- Use `inject()` instead of constructor injection.
- Use `input()` / `output()` functions instead of decorators.
- Use native control flow (`@if`, `@for`, `@switch`) — never `*ngIf`, `*ngFor`, `*ngSwitch`.
- Use **SCSS** for styles.
- Write styles in `.scss`, templates in `.html`, logic in `.ts`.

---

## Functionality: Same as the Old Juicebox

The lib is a port of the old juicebox admin ([juicejs/juicebox](https://github.com/juicejs/juicebox): Angular with ng-select, ngx-datatable and ng-bootstrap). **Functionality must stay exactly as it is there. Do not invent new behaviour.**

- Before changing or adding behaviour, look up how the old juicebox does it and match it: events, defaults, permissions and edge cases.
- No new features, options or behaviour "improvements". If the old juicebox has a bug, or the lib can't do what it did, flag it and ask before deviating.
- Changes that restore the old behaviour in the CDK-based components are fine (e.g. making `app-select` load the next page the way ng-select's `scrollToEnd` did).
- This covers functionality. The visual design follows the new look.

---

## TypeScript

- Use strict type checking.
- Prefer type inference when the type is obvious.
- Avoid `any` — use `unknown` when type is uncertain.
- Use descriptive variable names (`language` not `lang`, `isLoading` not `load`).

---

## CDK & Custom UI Components (No Angular Material)

The project has completely migrated from Angular Material to a custom UI component library built on top of the Angular CDK, located in `/projects/juicebar/src/lib/ui-components/`.

### Migration Mapping / Usage Rules

- **Cards**: Use `<app-card>`, `<app-card-header>`, `<app-card-title>`, `<app-card-content>`, `<app-card-actions>`.
- **Buttons**: Use `<button app-button>` with variants (e.g., `appearance="flat"`, `appearance="raised"`, `appearance="icon"`).
- **Icons**: Use `<app-icon [icon]="'name'"></app-icon>`.
- **Form Fields**: Use `<app-form-field>`, `<app-label>`, `<input appInput>`, and `<app-error>`.
- **Selects**: Use native select with `appInput` or `<app-select>`.
- **Dialogs**: Inject `DialogService` (wrapper for CDK Dialog) instead of `MatDialog`. Use `<app-dialog-title>`, `<app-dialog-content>`, `<app-dialog-actions>`.
- **Snackbars**: Inject `SnackbarService` instead of `MatSnackBar`.
- **Layouts**: Use `<app-toolbar>`, `<app-sidenav-container>`, `<app-sidenav>`.

---

## Components

- Keep components small and single-responsibility.
- Don't set `changeDetection`: OnPush is the default in Angular 22. (Older components still set it explicitly; that's harmless.)
- Use `input()` signal for inputs.
- Use `output()` function for outputs.
- Use `computed()` for derived state.
- Prefer inline templates only for very small components.
- Prefer Reactive forms over Template-driven forms.
- Do NOT use `ngClass` or `ngStyle` — use `class` and `style` bindings instead.
- Do NOT use `@HostBinding` / `@HostListener` — use the `host` object in the `@Component` or `@Directive` decorator instead.
- Use `NgOptimizedImage` for all static images (note: does not work for inline base64).

### Component Example

```typescript
import { Component, signal, inject } from '@angular/core';
import { DialogService } from '../../../ui-components';

@Component({
  selector: 'app-server-status',
  templateUrl: './server-status.html',
  styleUrl: './server-status.scss',
})
export class ServerStatusComponent {
  protected readonly isServerRunning = signal(true);
  private dialogService = inject(DialogService);

  toggleServerStatus() {
    this.isServerRunning.update(value => !value);
  }
}
```

```html
<app-card>
  <app-card-content>
    @if (isServerRunning()) {
      <span>Server is running</span>
    } @else {
      <span>Server is offline</span>
    }
    <button app-button appearance="raised" color="accent" (click)="toggleServerStatus()">
      Toggle
    </button>
  </app-card-content>
</app-card>
```

---

## Signals & State Management

### When to Use Signals

- Component state (counters, toggles, form data).
- Service-level state (current user, cart, theme, settings).
- Derived state with `computed()`.

### Signal Anti-Patterns — NEVER Do These

- Never use `effect()` for one-shot initialization — use `ngOnInit()` instead.
- Never use `signal.set({ ...signal(), key: value })` — use `signal.update(prev => ({ ...prev, key: value }))` to avoid race conditions.
- Never read non-reactive values in `computed()`. Use `toSignal()` for bridging RxJS forms.
- Never use `mutate` on signals — use `update` or `set` instead.
- Remove unused computed signals to prevent wasted cycles.

### When to Use effect()

- Logging.
- Saving to localStorage.
- Analytics tracking.
- API calls triggered by state changes.

---

## Templates

- Keep templates simple — avoid complex logic.
- Use native control flow (`@if`, `@for`, `@switch`).
- Do not assume globals like `new Date()` are available in templates.
- Use the async pipe for observables.
- When using external templates/styles, use paths relative to the component TS file.
- Use `@for` with track — always provide a track expression.

---

## Services

- Single responsibility per service.
- Use `providedIn: 'root'` for singleton services.
- Use `inject()` instead of constructor injection.
- No duplicate services.

---

## Component Customization & Modules

The juicebar (or juicebox) library supports extending built-in functionality via `app.config.ts`.

- **Component Overrides**: Replace built-in components with custom versions by mapping route paths (e.g., overriding groups-user inside the users module).
- **Module Control**: Built-in modules (like users or exports) can be completely disabled or enabled.
- Avoid using older dynamic tab addition methods; focus strictly on component overrides and proper dependency injection in customizations.

---

## Code Organization

- No dead code — delete unused imports, signals, or methods.
- Extract shared utilities to avoid repetition.
- Avoid O(n) lookups in hot paths — build Map lookups for static data.

---

## Styles (SCSS)

- Use SCSS for all component styles.
- Use global color variables defined in `/projects/juicebar/src/lib/ui-components/styles/variables.scss` (--color-secondary, --color-tertiary, etc.), or in `projects/juicebar/src/lib/styles.scss`.
- Use other global variables defined in `projects/juicebar/src/lib/styles.scss` for styling.
- Check similar custom components and extend styles rather than writing from scratch.
- Keep CSS as light and minimal as possible

### Theme-Aware Colors (Light/Dark Mode)

The project supports light/dark theme toggling via `html.light-theme` (managed by `ThemeService`). The CSS custom properties are defined in `projects/juicebar/src/lib/styles.scss` (dark default on `:root`, light overrides under `html.light-theme`) and `projects/juicebar/src/styles.scss`. For theme toggling to work, ALL colors must resolve through these CSS custom properties.

**Use `var(--color-*)` CSS custom properties for colors by default.** This is the only way the light/dark toggle reaches the rule. A hard-coded color is allowed where someone wants one on purpose (it then stays the same in both themes); don't treat it as a mistake by itself.

- Backgrounds: `var(--color-background)`, `var(--color-background-secondary)`, `var(--color-grey-100..900)`
- Text: `var(--color-text-primary)`, `var(--color-text-secondary)`, `var(--color-text-disabled)`
- Borders: `var(--color-border)`, `var(--color-border-light)`, `var(--color-border-dark)`
- Accents: `var(--color-secondary)`, `var(--color-tertiary)` (and their `-light`/`-dark`/`-contrast` variants)
- Semantic: `var(--color-success)`, `var(--color-warning)`, `var(--color-error)`, `var(--color-info)`
- Shadows: `var(--shadow-sm..xl)` (also remapped per theme)

### Color Anti-Patterns — NEVER Do These

- Don't hardcode hex (`#1c1c1f`, `#f97316`) or named colors (`white`, `black`) for theme-able surfaces, text, or borders unless that is deliberate — they don't change with the theme.
- Never use the legacy SCSS color variables (`$primary`, `$gray-100`, `$gray-200`, `$error`, `$success`, `$warning`, `$primary-light`, etc.) defined in `lib/styles.scss` for new code — they are static and bypass the theme system. Migrate to `var(--color-*)` when you touch surrounding code.
- Never use `rgba($primary, 0.1)` or `lighten($primary, 10%)`-style SCSS color functions for theme surfaces — they bake in a static color. Prefer `var(--color-secondary)` / `var(--color-tertiary)` with opacity via a sibling CSS layer, or use the existing `rgba(var(--color-secondary-rgb), 0.1)` pattern where available.
- Never set hardcoded backgrounds on `:host` of a `ui-components/` component — every `app-*` host inherits its colors from CSS vars so it follows the theme.

### When Adding/Editing a Component

1. If you need a color, pick the matching `var(--color-*)` token first.
2. If no existing token fits, **add a new CSS custom property** to `projects/juicebar/src/lib/styles.scss`:
   - Add the dark-mode value under `:root` (around the existing `--color-*` declarations).
   - Add the light-mode override under `html.light-theme`.
   - Then reference it as `var(--your-new-token)` in the component. Never inline a hex when a new token is the right answer.
3. Verify by toggling the theme (`html.light-theme` class) — backgrounds, text, borders, and hover states must all flip.

---

## HTML & Accessibility

- Must pass all AXE accessibility checks.
- Must follow WCAG AA minimums: proper focus management, color contrast, and ARIA attributes.
- Use semantic HTML elements.

---

## Project Structure

```
projects/
└── juicebar/
    ├── schematics/                    # Custom Angular schematics
    └── src/
        └── lib/
            ├── config/                # Application configurations (app.config.ts defaults)
            ├── core/                  # Core functionality
            │   ├── components/        # Core UI (login, main, profile, user-menu)
            │   ├── guards/            # Route guards
            │   ├── interceptors/      # HTTP interceptors
            │   ├── models/            # TypeScript interfaces/models
            │   └── services/          # Singleton services (auth, config, navigation)
            ├── environments/          # Environment configurations
            ├── modules/               # Feature modules (e.g., dashboard)
            ├── shared/                # Shared utilities and configurations
            ├── ui-components/         # CDK-based custom component library
            ├── bootstrap.ts           # Application bootstrapping
            ├── juicebar.component.ts  # Root component
            └── public-api.ts          # Public API surface
```

---

## Routing

- Implement lazy loading for feature routes.

---

## Workflow Reminders

- Adding or porting a module: read `projects/juicebar/MODULE_GUIDE.md` and start from the generator (`ng g …:module`, see the `juicebar-module` skill).
- No need to run build commands.
- Always check existing custom UI components (ui-components) before creating new ones or reaching for external libraries.
- When updating a component: logic in `.ts`, styles in `.scss`, template in `.html`.

## Avoid Function Calls in Templates

Function calls in templates re-execute on every change detection cycle, which can be hundreds of times per second. This wastes CPU, makes behavior unpredictable, and causes hard-to-debug issues — especially harmful since we use OnPush + signals.

### Anti-Patterns — NEVER Do These

Never call methods directly in interpolation: {{ getFullName() }}.
Never call methods inside @for track expressions or @if conditions: @if (isUserActive(user)).
Never call methods in property bindings: [disabled]="isFormInvalid()".
Never use getters that perform computation — they behave like function calls in templates.

### Use Instead

**computed()** for derived state — only re-runs when its signal dependencies change.
**Signals** for values that change over time.
**Pure pipes** for transformations on inputs (Angular caches the result).
**P
lain properties** for static or one-time computed values.

### Example
typescript
// ❌ Bad — runs on every change detection cycle
export class UserCardComponent {
  user = input.required<User>();

  getFullName() {
    return `${this.user().firstName} ${this.user().lastName}`;
  }
}
html
<span>{{ getFullName() }}</span>
typescript
// ✅ Good — recomputes only when user signal changes
export class UserCardComponent {
  user = input.required<User>();
  protected readonly fullName = computed(
    () => `${this.user().firstName} ${this.user().lastName}`
  );
}
html
<span>{{ fullName() }}</span>