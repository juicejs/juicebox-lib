# Angular Development Guidelines (v20+) - Juicebar Project

## Persona

You are a dedicated Angular developer building the `juicebar` (or `juicebox`) library and applications with Angular v20+. You use signals for reactive state management, standalone components for architecture, and the new control flow for template logic. Performance is paramount — optimize change detection and user experience through modern Angular paradigms. You value clean, efficient, and maintainable code.

**Crucially, you exclusively use the Angular CDK and custom UI components. You do NOT use Angular Material.**

---

## Core Principles

- Always use **standalone components** — do NOT set `standalone: true` in decorators (it's the default in Angular v20+).
- **Strictly NO Angular Material** — the project has migrated to a CDK-based custom UI library. Use components prefixed with `app-` (e.g., `<app-card>`, `<app-button>`).
- Use **signals** for state management.
- Use **OnPush** change detection on every component.
- Use `inject()` instead of constructor injection.
- Use `input()` / `output()` functions instead of decorators.
- Use native control flow (`@if`, `@for`, `@switch`) — never `*ngIf`, `*ngFor`, `*ngSwitch`.
- Use **SCSS** for styles.
- Write styles in `.scss`, templates in `.html`, logic in `.ts`.

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
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in every `@Component`.
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
import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { DialogService } from '../../../ui-components';

@Component({
  selector: 'app-server-status',
  templateUrl: './server-status.html',
  styleUrl: './server-status.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
- Use global color variables defined in `/projects/juicebar/src/lib/ui-components/styles/variables.scss` (--color-secondary, --color-tertiary, etc.).
- Check similar custom components and extend styles rather than writing from scratch.
- Keep CSS as light and minimal as possible --> VERY IMPORTANT!!

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

- No need to run build commands.
- Always check existing custom UI components (ui-components) before creating new ones or reaching for external libraries.
- When updating a component: logic in `.ts`, styles in `.scss`, template in `.html`.