# Encoding report part: exports (2026-11-11)

Reverse encoding (AIM 6.4, §13) of the juicebar library's **exports** module into `juicebar.exports` and five children. Every `.aim` file carries `provenance: inferred`. No code was changed.

## Files

- `aim/juicebar/exports/juicebar.exports.aim` — the module: requirements shared by the children, the Persona `ExportStaff`, the Records `ExportTemplate` (with the parts `FilterValue`, `TemplateSort`, `TemplateMeta`) and the Capabilities `DataSources`, `FilterOptions` and `ExportFormats`
- `aim/juicebar/exports/templates/juicebar.exports.templates.aim` — the list of templates, the admin's search over them, deleting one
- `aim/juicebar/exports/editor/juicebar.exports.editor.aim` — creating and changing a template (one editor, two pages)
- `aim/juicebar/exports/filters/juicebar.exports.filters.aim` — the data source's filters, in the editor and the Excel dialog, with the backend search for options
- `aim/juicebar/exports/excel/juicebar.exports.excel.aim` — downloading a spreadsheet, with Quality Circle's filter editing before it
- `aim/juicebar/exports/pdf/juicebar.exports.pdf.aim` — downloading a zip of PDFs

## Method and scope

**Read:**

- The lib's exports module, the realization: `projects/juicebar/src/lib/core/modules/exports/**` (listing, create and edit pages sharing `ExportTemplateEditorComponent`, filters, async multiselect, Excel and PDF dialogs, `exports.service.ts`, `exports-shared.ts`, `exports.providers.ts`, the label dictionary, the specs), `config/base-app.config.ts#ExportsOptions`, the sidebar entry in `core/modules/main/main.providers.ts` (`data-export:role`), `core/shared/services/juice.service.ts#requestBinary` and the shared confirmation dialog.
- The lib's commits on the module: `c2026c1` (one editor; QC's timeout and hidden filter as options; the fixes), `4a81c04`, `1386841`, `4d77383` (dates as `{year, month, day}`), `252eb5d` (split view) and `5804379` (the search provider, 2026-06-18).
- Other places in the lib that run an export: none. `ExportsService`, the dialogs and `getPreview` are used only inside the module; the module's one contribution elsewhere is the "Exports" search provider registered in `provideExports`.
- The backend: `juicejs/juice-modules`, `packages/juice/src/modules/exports-imports/exports/**` at commit `b823636d` (2026-10-20): `ExportsService` (`exports`), `ExportTemplateService` (`exports:template`), `FilterService` (`exports:filter`), `DataSourceService` (`exports:data-source`), `ColumnService` (`exports:column`), `AbstractDataSource`, `ExcelExportStrategy`, `PdfExportStrategy`, `IExportServiceMiddleware`, `IFilterItemsFetcherStrategy`, `helpers/Helper.ts`, `helpers/Formatter.ts`; permissions from each method's `RemotableUserSessionFilter`.
- The projects' backend parts, only to find the extension points: Quality Circle's `quality-circle-platform/src/modules/qualitycircle/services/exports/middleware/QCExportServiceMiddleware.ts`; Visitor's `visitor-app/src/system/exports/**` (middleware; the `sap-data:strategy`, `invoice:strategy` and `vendors:strategy` data sources; the PDF formats); AMG's `amg-experience/src/modules/bookings/services/BookingService.ts#getExportCategories`.
- The functional reference: the old juicebox, `juicejs/juicebox` branch master at `c6cca1640` (2026-04-15), `src/app/exports/**`.
- Quality Circle's admin: `quality-circle/apps/juicebox/src/app/exports/**` at `ecf9e966e4` (2026-11-09) and `src/services/juice.service.ts#requestBinary` (90 s limit on every binary request).

**Left out on purpose:**

- The framework: the sidebar entry, the breadcrumb (`navigationEvent`), how the page action is drawn, the compact list beside an open template and the state it remembers (`injectListingPane`, `ListingStateService`), the search box itself, the help text and the `ui-components`. The module's part of the search (what it finds and opens) is encoded as `View: TemplateSearch`.
- The visual design.
- Each project's data sources, option searches, export formats and middleware. They are encoded as the extension points: `Capability: DataSources`, `Capability: FilterOptions`, `Capability: ExportFormats` and the middleware in TPLSCOPE.
- The preview: `getPreview` is in the lib's service and on the backend, but nothing in the lib calls it, and the old juicebox had its menu item commented out (question 11).
- The backend's older Excel export (`excel-export-service`, role `exports:role`, `POST /exports/:strkey`, `excelexports:strategy` strategies) and the `imports/` half of `exports-imports`: the lib uses neither.
- A template's `attributes`: the backend stores them when sent; the lib never sends them.
- The library's customization hooks (`componentOverrides`, `providers` of `provideExports`).

**Modelling notes:**

- A template's creator is held as a plain `string` (`TemplateMeta.user_id`): the User record is not modelled yet. Once it is, it becomes a `ref(...)` to it.
- A filter's value has no single schema type (a text, a number, a date `{year, month, day}`, an option id or a list of them). `FilterValue.value` is written as `string`, and its Constraint says what it holds.
- Loading the data sources, columns and filters is not modelled as operations of its own: the Views name what they show and bind the backend methods, and the Operations that store or download a template invoke the Capabilities.
- The Capabilities are bound to the backend's service methods. `DataSources.Rows` and `ExportFormats.Render` share `service:exports#exportData` with the handlers of `ExportExcel` and `ExportPdf`, since that method runs both.
- Root requirements satisfied from this module: ROLES, UILABELS and CONFIG. LANG is not touched: the module keeps no per-language text of its own (a template's name is one text).

## Confidence per intent

| Intent | Confidence | Why |
|---|---|---|
| `juicebar.exports` | needs-human-check | Permissions read from each backend method's filter; SAPADMIN is enforced only in the admin (question 1) and the default reach of templates may not be the commitment (question 2) |
| `juicebar.exports.templates` | high | Read from the listing and the backend; the search and the sorting are the lib's own (questions 4 and 5) |
| `juicebar.exports.editor` | high | Read from the shared editor, both pages and the backend; the project switches are hard-coded keys (question 9) |
| `juicebar.exports.filters` | needs-human-check | A data source without filters leaves the previous filters on screen (question 3); AMG's booking categories may not show (question 7) |
| `juicebar.exports.excel` | needs-human-check | QC's filter editing: the failure rule, the permission it needs and searched filters in the dialog (question 6) |
| `juicebar.exports.pdf` | high | Read from the dialog, `PdfExportStrategy` and `Helper.generateUniqueSanitisedFileName` |

## Questions for the owner

1. **A SAP template's download needs `admin` only in the admin.** The listing disables the download button of a `sap-data:strategy` template without `data-export:role#admin` (`export-template-listing.component.html`, `[NoPermissionDisable]` on the download button; the same in the old juicebox and QC), and creating one warns about it. The backend's `exportData` asks only for `export` (`ExportsService.ts`, `RemotableUserSessionFilter('data-export:role', 'export')`), and Visitor's middleware lets it through (`VisitorExportMiddleware.preExportData`). Should the backend refuse it without `admin`, or is the disabled button the rule?
2. **Which templates a staff member reaches.** By default the backend lets everyone with the role list, open, change, download and delete every organisation's templates (`ExportTemplateService.getExportTemplates` matches only `deleted: false`). Quality Circle narrows it to the organisations in the staff member's scope (`QCExportServiceMiddleware`: `preGetExportTemplates`, and `MultiTenancyUserProtection` on get, edit, delete and export); Visitor lists only the signed-in organisation's but opens any by id (`VisitorExportMiddleware.preGetExportTemplates`). TPLSCOPE encodes the default and the middleware as the way to narrow it. Is the open default the commitment, or should a template belong to its organisation by default, as a category does?
3. **A data source without filters.** The backend answers `getDataSourceFilters` with the error `no_available_filters` when a data source declares no filters (`FilterService.getDataSourceFilters`). The editor shows that key untranslated as an error and returns before replacing the filters, so the previous data source's filters and values stay on screen (`export-template-editor.component.ts#loadFilters`); the fix in `c2026c1` ("a data source without filters kept the previous one's filter values") only helps when the backend answers an empty list, which it never does. The Excel dialog then warns that the filters could not be loaded. The old pages did the same. Should such a data source show "No filters available" without an error, and clear the previous filters?
4. **The admin's search over templates is the lib's own.** `exports.providers.ts#provideExports` registers an "Exports" search provider (commit `5804379`); neither the old juicebox master nor QC has one. TPLSEARCH encodes it. Keep it?
5. **Sorting and page sizes in the list.** The lib sorts the list by name and by data source and offers 5, 10, 25 or 50 templates a page (`export-template-listing.component.ts`, columns with `sortable: true`; the data table's `pageSizeOptions`); the old list had neither (`[sortable]="false"`, 10 a page). Sorting by data source cannot work: the backend sorts on `_data_source.name`, which it fills in after the query (`ExportTemplateService.getExportTemplates`), so the order stays as stored. Keep the sorting (and sort the data source by `data_source_key` or its name), or go back to the old list?
6. **Changing the filters before an Excel download (Quality Circle).** (a) When storing the changed filters fails, the lib downloads nothing and says so; QC ignored the failure and downloaded with the old filters (`excel-export-confirm.component.ts#download`, QC's `excel-export-confirm.component.ts#export`). (b) Storing them needs only `export`, not `update` (`ExportTemplateService.editExportTemplateFilters`), so a staff member who may not edit templates changes a template's filters for everyone. (c) A searched filter can't load its options in the dialog: the dialog gives the filters no data source (`excel-export-confirm.component.html`, `<app-export-filters>` without `[selectedDataSourceKey]`; the same in QC), so `AsyncMultiselectComponent#getFilterOptions` fails on it. Confirm (a) and (b); should (c) be fixed?
7. **AMG's booking categories.** The lib gives the `category` filter the booking categories when a template is created too; the old juicebox did it only when one was edited (`export-template-editor.component.ts#loadFilters`, the old `export-template-edit.component.ts#getFilters`). AMG's `booking-service#getExportCategories` (`BookingService.ts` line 2551) answers a list of German names and needs `bookings:role`, while the filter's choices expect `{id, label}` (`export-filters.component.html`), so the names may show empty. Which applies, and does AMG's category filter work today?
8. **0 and false count as nothing.** A filter whose value is 0 or false is not stored (`FilterService.parseExistingFilters`: `if (!filters[dsFilter.id]) continue;`), and the backend's Excel format writes 0 and false as empty cells (`ExcelExportStrategy.exportData`: `item[column.id] || ''`). KEEPKNOWN and EXCELSHEET encode both. Intended?
9. **Switches named after projects and data sources.** Grouped columns and booking categories turn on with the `amgshop` configuration entry, filter editing with `excel:export:strategies`, and the vendors, invoice and SAP rules hang on Visitor's data source keys `vendors:strategy`, `invoice:strategy` and `sap-data:strategy`, all hard-coded in the lib (`export-template-editor.component.ts`, `export-template-create.component.ts`, `export-template-listing.component.html`). They are switched by the backend, as CONFIG asks; should they stay as they are, or become `provideExports` options?
10. **Formats the admin can't open.** A format whose key is neither `excel:export:strategy` nor begins with `pdf` is listed in the download button, but picking it does nothing (`export-template-listing.component.ts#openExportConfirmationModal`, as in the old juicebox). Leave it, or list only the formats the admin can open?
11. **Unused service calls.** The lib's `ExportsService` keeps `getPreview` and `getDataExportStrategies`, which nothing in the lib calls. The intent has no preview. Remove them, or is a preview wanted back?
12. **The lib's fixes over the old pages.** Encoded as the lib does them, from `c2026c1`, `4a81c04` and `1386841`: a download is taken as failed only for a small JSON error or an "Error…" text (the old dialogs also refused small files without a comma); a 413 or network failure ends with a message instead of hanging; picking a whole column group adds each column once; reordering the selected columns is saved; a failed filter load in the Excel dialog falls back to the saved filters with a warning (QC failed there). Confirm they stay.
