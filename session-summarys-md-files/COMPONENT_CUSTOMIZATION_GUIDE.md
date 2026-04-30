# Component Customization Guide

This guide explains how apps can customize and extend juicebox library components.

## Overview

The juicebox library now supports two types of customizations:

1. **Component Overrides** - Replace built-in components with your custom versions
2. **Module Control** - Enable/disable built-in modules (users, exports)

## Configuration

All customizations are configured in your app's `app.config.ts`:

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideJuicebar({
      apiUrl: environment.apiUrl,
      appName: 'My App',
      modules: [
        // Your top-level modules
      ],
      mainRoutes: [
        // Your main route modules
        {
          path: 'trainings',
          loadChildren: () => import('./trainings/trainings.module').then(m => m.TrainingsModule),
          navigation: {
            label: 'Trainings',
            icon: 'school'
          }
        }
      ],
      builtInModules: {
        users: {
          enabled: true, // Set to false to disable users module entirely
          customization: {
            componentOverrides: [
              {
                routePath: ['details/:id', 'groups-user'],
                component: CustomGroupsUserComponent
              }
            ],
            providers: [
              // Custom providers for users module
              CustomUsersService
            ]
          }
        },
        exports: {
          enabled: false // Disable exports module completely
        }
      }
    }).providers
  ]
};
```

## Use Cases

### 1. Override Existing Component

Replace the built-in `groups-user` component with your custom version:

```typescript
// In your app: src/app/custom-components/custom-groups-user.component.ts
@Component({
  selector: 'app-custom-groups-user',
  template: `
    <div>
      <h3>My Custom Groups Component</h3>
      <!-- Your custom implementation -->
    </div>
  `
})
export class CustomGroupsUserComponent {
  // Your custom logic
}

// In app.config.ts
builtInModules: {
  users: {
    enabled: true,
    customization: {
      componentOverrides: [
        {
          routePath: ['details/:id', 'groups-user'],
          component: CustomGroupsUserComponent
        }
      ]
    }
  }
}
```

**Result**: When users navigate to `/main/users/details/123/groups-user`, they see your custom component instead.

### 2. Disable Built-in Modules

Remove modules you don't need:

```typescript
// In app.config.ts
builtInModules: {
  exports: {
    enabled: false // Completely removes exports module
  }
}
```

**Result**: No exports module routes or sidebar entry in your app.

### 3. Multiple Overrides

Override multiple components at once:

```typescript
builtInModules: {
  users: {
    enabled: true,
    customization: {
      componentOverrides: [
        {
          routePath: ['details/:id', 'groups-user'],
          component: CustomGroupsUserComponent
        },
        {
          routePath: ['details/:id', 'details-user'],
          component: CustomUserDetailsComponent
        },
        {
          routePath: ['listing'],
          component: CustomUserListingComponent
        }
      ]
    }
  }
}
```

## Route Path Reference

### Users Module Route Paths

For `componentOverrides`, use these route paths:

- **User Listing**: `['']` or `['listing']`
- **User Details Form**: `['details/:id', 'details-user']`
- **User Documents**: `['details/:id', 'documents-user']`
- **User Wallets**: `['details/:id', 'wallets-user']`
- **User Roles**: `['details/:id', 'roles-user']`
- **User Groups**: `['details/:id', 'groups-user']`
- **User Organizations**: `['details/:id', 'organisations-user']`
- **User Channels**: `['details/:id', 'channels-user']`
- **User Sidebar**: `['details/:id', 'sidebar-user']`
- **User Wizard**: `['user-wizard', 'main']`


### Exports Module Route Paths

- **Exports Listing**: `['']` or `['listing']`
- **Export Template Edit**: `['template/:id']`
- **Export Filters**: `['filters']`

## Technical Implementation

The customization system uses:

1. **APP_INITIALIZER** - Ensures router is ready before applying customizations
2. **Router.resetConfig()** - Dynamically modifies route configuration
3. **Dependency Injection** - Clean integration with Angular's DI system

## Component Requirements

Your custom components should:

1. **Implement the same interface** as the component they replace
2. **Handle route parameters** appropriately (e.g., user ID in details pages)
3. **Use the same services** or inject your custom ones
4. **Follow Material Design** patterns for consistency

## Best Practices

1. **Keep existing functionality** - Users expect certain features to work
2. **Use TypeScript interfaces** - Define clear contracts for your components
3. **Test thoroughly** - Custom components affect core user workflows
4. **Document changes** - Help your team understand customizations
5. **Consider updates** - Library updates may affect your customizations

## Debugging

Enable console logging by checking the browser console for:
```
Module customizations applied
```

Common issues:
- **Route path mismatch** - Check the exact path structure
- **Component not found** - Ensure component is properly imported
- **Timing issues** - Customizations apply after router initialization

## Migration Notes

If you were previously using the `UsersModule.overwriteRoute()` method directly, migrate to this configuration-based approach for better maintainability.

**Breaking Changes:**
- **Tab Extensions Removed** - Dynamic tab addition is no longer supported for stability reasons
- **Component Overrides Only** - Focus on replacing existing components rather than adding new routes
- **No Tree-Shaking** - Disabled modules are excluded from routes/sidebar but still bundled for reliability