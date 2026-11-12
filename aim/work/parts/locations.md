# Encoding report part: locations (2026-11-11)

Reverse encoding (AIM 6.4, §13) of the juicebar library's **locations** module into `juicebar.locations` and its six children. Every `.aim` file carries `provenance: inferred` and waits for the owner's confirmation, intent by intent. No code was changed. This part goes into the main report, `aim/work/encoding-juicebar-2026-11-11.md`.

## Method and scope

**Read:**

- The lib's locations module, the realization: `projects/juicebar/src/lib/core/modules/locations/**` (listing, wizard, details tabs: details, attributes, media, documents and seating layout with its add dialog; `location-fields`, `location-form.ts`, `locations-shared.ts`, `geocoding.service.ts`, `locations.service.ts`, `locations.types.ts`, `locations.route.ts`, `locations.providers.ts`, the label dictionary), the `LocationsOptions` in `config/base-app.config.ts`, the sidebar entry in `core/modules/main/main.providers.ts`, the shared media component (`core/shared/components/media/**`) and the unsaved-changes guard. Lib commits `4dd3e54`, `66c6301`, `252eb5d`, `8508c4b`, `df28ee1` (HEAD `10d89df`).
- The backend: `juicejs/juice-modules` at `b823636d` (2026-10-20), `packages/juice/src/modules/locations/**` (`LocationService`, `Location`, `LocationCountry`, `countries.ts`, `HelperFunctions.uniqueSlugify`, `ILocationServiceMiddleware`, `LocationProvider`) and `modules/users/filter/RemotableUserSessionFilter.ts`. The standalone `locations` repository (`37d9e93`) has the same `LocationService` with other import paths.
- Quality Circle's backend: `quality-circle-platform/src/middleware/LocationServiceMiddleware.js` (refuses deleting a location an open training or a shift uses).
- The functional reference: the old juicebox, `juicejs/juicebox` branch master at `c6cca1640`, `src/app/location/**`, and Quality Circle's admin at `ecf9e966e4`, `apps/juicebox/src/app/location/**`.

**Not found:** the `room-plan` backend service. It is not in `juice-modules/packages`, `quality-circle-platform/src`, `locations/src` or the other repositories of the workspace. `Capability: RoomPlans` and `Record: RoomPlan` are written from the lib's calls only (`room-plans.ts`). Nothing in the backends read sets a location's `cannotArchive`.

**Left out on purpose:**

- The framework: the sidebar entry, the compact listing beside an open location (split view), the breadcrumb and record header, the unsaved-changes dialog itself, and the `ui-components`.
- The visual design, including the hatching patterns' drawings.
- The library's customization hooks (`componentOverrides`, extra `providers` through `provideLocations`).
- `LocationsService.search` and the backend's `search`: no screen of the module calls them; other modules do.
- The backend's old Express controller (`locations:juicebox:controller`), which the lib does not call, and the `meta.dataProvider` fields that imports fill.

**Users:** nothing in locations holds a user id, so no `User` reference was needed.

**Configuration the module reads:** the backend configuration `locations:service` (`strictTenancy`), the configuration schemas `location:type`, `location:category` and `juicecommerce:location:attribute`, and `media` (the collections `locations` and `locations_documents`). The project's options are `provideLocations({options: {hiddenTabs, fields, emailHint, shortNameMaxLength, ownerFilter, archivableTypes, deletableTypes}})`.

**Binding locators** follow the main report. New outside sites: the address lookup `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/find`, the room plans service `service:room-plan#…`, and Quality Circle's delete check `service:locations:service:middleware:qc#preDeleteLocation`.

## Confidence per intent

| Intent | Confidence | Why |
|---|---|---|
| `juicebar.locations` | needs-human-check | Permissions and organisation checks read from the backend's filters and `canWrite`/`readScope`; LOCSEE has two rules (question 1); `LocationAttributes` names only the fixed attributes (question 13) |
| `juicebar.locations.list` | needs-human-check | Read from the listing and `fetch`; the delete confirmation is the lib's own (question 2), archiving rewrites the name (question 3), and the "Show locations" choice filters only the page shown (question 4) |
| `juicebar.locations.create` | high | Read from the wizard, `location-form.ts` and `createLocation`; matches Quality Circle's wizard (question 6 for the old juicebox) |
| `juicebar.locations.details` | high | Read from the tabs, the details tab and `updateLocation`; question 5 on the required type and 8 on regions |
| `juicebar.locations.attributes` | high | Read from the tab and `updateAttributes`; matches the old tab |
| `juicebar.locations.media` | high | Read from the two tabs, the shared media component and the backend's media methods; question 14 on how documents are told apart |
| `juicebar.locations.seating` | needs-human-check | The room plans service was not found (question 11), and its buttons ask for another module's permission (question 7) |

## Questions for the owner

1. **Which venues a staff member sees.** The listing shows the venues of the organisation the staff member is signed in to and those without one, for everyone, a super admin too, whatever `strictTenancy` says (`LocationService.ts` lines 110–113). Opening a location uses another rule: also the venues of every organisation where the staff member has `locations:role`, every venue for a super admin, and every location with `strictTenancy` off (`readScope`, lines 400–418). LOCSEE encodes both. Which one is meant, for both?
2. **Deleting asks first only in the lib.** The lib asks "Delete the location …" before deleting from the listing (`listing/location-listing.component.ts` line 213). Neither the old juicebox (`listing/location-listing.component.ts` lines 141–148) nor Quality Circle (line 167) asks. DELETE encodes the confirmation. Keep it, or delete at once as before?
3. **Archiving from the listing rewrites the location.** The listing archives by sending the whole location back through `updateLocation` (`location-form.ts#storedLocationUpdate`, line 151): the name shown is stored as the name in the admin's language, so a location without a name in that language gets another language's name there, and the slug of that language is made again. Quality Circle did the same with the English name first (lines 187 on). Should archiving change only `archived` (a backend method of its own), or is this intended?
4. **"Show locations" filters only the page shown.** All, Mine and Public filter the rows already fetched (`listing/location-listing.component.ts` line 121), as in Quality Circle (`onDisplayFilter`, line 177): Mine can show an empty page while the count still counts every location. Should the backend filter by owner instead?
5. **The type is required on the details tab.** The lib requires a type on the create page and on the details tab (`location-form.ts` line 13). The old juicebox and Quality Circle require it only when creating (`details-location.component.ts` lines 57 and 58). LOCTYPES encodes it as always required. Agreed?
6. **After creating.** The lib opens the new location (`wizard/location-wizard.component.ts` line 86), as Quality Circle does; the old juicebox went back to the listing (line 193). Is opening the new location the rule for every project?
7. **The seating layout's permission.** Add and Remove are shown only with `room-plan:role#update` (`seating-layout.component.html` lines 3 and 30), as in the old juicebox, but the backend changes the venue only with `locations:role#updated` (`updateAttributes`, line 224). Staff with only one of the two get buttons that fail, or no buttons. Which permission should it be?
8. **Regions are locked only in the admin.** Save is disabled on a region without `locations:role#admin` (`details-location.component.ts` line 50), as before, but `updateLocation` saves a region for anyone with `updated`, and the listing deletes regions (and archives them where `archivableTypes` names `region`) without that check. Should the backend refuse it too?
9. **Permissions the backend doesn't install.** The backend installs `create`, `updated` and `delete` on `locations:role` (`LocationService.ts` lines 69–80). The lib also uses `admin` (regions) and the backend `super-admin` (every organisation); a project must add them to the role itself. The media buttons, archive and delete show to every staff member of the module and only the backend refuses. Should `admin` and `super-admin` be installed, and should these buttons be hidden without the permission, as Add new and the attributes' Save are?
10. **`cannotArchive`.** The details tab hides the Archived switch for a location marked `cannotArchive` (`details-location.component.html` line 10), as Quality Circle did, but nothing in `juice-modules` or Quality Circle's backend sets it. Who sets it, and should it also stop archiving from the listing?
11. **Where is the room plans service?** The seating layout reads and searches room plans through `room-plan` (`getRoomPlan`, `fetch`), which none of the repositories read has. Which repository holds it, so `RoomPlans` can be checked and its `fetch` search confirmed (first ten matches by name)?
12. **What do "Organisation wide visibility" and "Accessibility" do?** The locations service only stores them. Which modules read them, and what for, so the intent can state the rule rather than just the switch?
13. **A stadium's or hall's attribute values.** They are kept loose in the location's attributes, beside the coordinates, email, hatching pattern and room plans, under each configured field's `property`. An AIM part holds only the fields its Record names, so `LocationAttributes` states them in a constraint, and `UpdateLocationAttributes` takes them as `values: map(string)` although a number field stores a number. Keep this, or keep them under a key of their own (a data change)?
14. **How documents are told apart.** The Documents tab lists the files whose media type key is `standard:document` and the Media tab the others (`location-media.component.ts` lines 11 and 65), as before. A file uploaded on Documents under another media type of `locations_documents` would show on Media. Is every media type of `locations_documents` `standard:document`, or should the tabs go by collection?
15. **Sorting by name and by country.** The backend sorts by the stored field (`LocationService.ts` lines 150–154): the name is the object of all languages and the country is its id, so neither sorts by the text shown. Intended, or should it sort by the name in the admin's language and the country's name?
16. **The address lookup.** Coordinates come from Esri's free address search, as the old juicebox's leaflet search did, with the address sent from the browser (`geocoding.service.ts`). When it finds nothing or fails, the location is saved without new coordinates and nobody is told. Is that the commitment, and is the free service the one to keep?
17. **The lib's changes to the old behaviour, to confirm.** Lib commit `4dd3e54` fixed: the address search got "[object Object]" as the country, saving the details lost the stored attributes, an emptied email stayed, archiving from the listing lost the name and the accessibility, and removing a room plan removed the wrong one. It also added notices: "Room plans added", "Room plan removed", and "Attributes updated" where the old tab said "availability_updated". The Attributes and Documents tabs, commented out in the old juicebox (`details.component.html` lines 7 and 15), are shown by default as in Quality Circle, and `hiddenTabs` hides them. Are these the intended behaviour for every project?
