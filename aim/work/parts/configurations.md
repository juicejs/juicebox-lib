# Encoding report part: configurations (2026-11-13)

Reverse encoding (AIM 6.4, §13) of the old juicebox's **configuration** admin module into `juicebar.configurations`, one file, from the old juicebox (master) and the backend as they are now. Added in Studio through Amy in one change (the file and the root's Children line), then confirmed there on Mario's delegation ("Record Mario's approval of the configurations module", `approved_by: Mario`, `approved_at: 2026-11-13`). The bindings name the lib's code, which was built from the confirmed intent the same day.

## Files

| File | Holds |
|---|---|
| `aim/juicebar/configurations/juicebar.configurations.aim` | the module: CONFROLE, CONFLIST, CONFFILTER, CONFREAD, CONFNEW, CONFEDIT, CONFSAVE, CONFDELETE; `Persona: ConfigurationAdmin`; the Views `ConfigurationList`, `CreateConfigurationDialog`, `EditConfigurationDialog`; the Operations `InstallConfiguration`, `UpdateConfiguration`, `DeleteConfiguration`; `Record: Configuration` |
| `aim/juicebar/juicebar.aim` | one Children line |

## Method and scope

**Read:**

- The old juicebox, `juicejs/juicebox` master at `c6cca1640`: `src/app/configuration/**` (module, routes, listing, add and edit dialogs, dictionary), `src/services/configuration.service.ts`, `src/types/Configuration.ts` and `ComparedConfiguration.ts`, the sidebar entry in `generator/modules.json` (`configuration`, `configuration:role`, `fas fa-tools`). The 210 remote branches that have the module differ from master only in styles and `entryComponents`.
- The backend, `juicejs/juice-modules` master at `b823636d`: `packages/juicebox/src/services/configuration/ConfigurationService.ts` (every method needs `configuration:role`; the role is not installed by the backend) and `packages/juice/src/modules/configuration/Configurations.ts` (`install`, `update`, `delete`, `load`), `packages/juice/src/models/Configuration.ts`.

**Left out on purpose:**

- `getByKey` and `getBySchema`: other modules' reads of single configurations, with their protected keys (`networking`, `users`, the `mailing:provider` schema) for staff without the role. The module does not call them.
- The framework: the sidebar entry, the breadcrumb, the JSON editor's own behaviour (Format, Compact, undo, the error line).
- The old editor's Sort, Transform, Repair and Text/Code mode switch: the lib's editor has no dependency (owner's ruling, 2026-11-13) and keeps Format, Compact, undo and redo.

## Modelling notes

- The configuration sent is free JSON; Input fields are `string`, described as the JSON written, since a `part(...)` would refuse a configuration's own fields (a role's `permissions`).
- The backend's quirks are encoded as they are: an update keeps the fields left out of the text (it merges), a text of any 12 characters is stored as an id, and `delete` answers success before the deletion is done.

## Where the lib differs from the old admin, on purpose

- When the comparison can't be read, the backend's error shows and the Edit dialog closes; the old one stayed open and empty.
- A copy only in the database with no name or schema shows "[DB]"; the old one showed "[DB]undefined".
- The breadcrumb's link leads to the listing (`/main/configuration`); the old one pointed at `main/configurations`, which does not exist.
- "Applied from", "Cancel" and "Save" come from the dictionary (English and German); the old screens had them in English only.
- No answer from the gateway at all shows no second error notice; the old one showed an empty error.
