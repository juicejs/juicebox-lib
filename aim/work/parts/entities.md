# Encoding report part: customers / entities (2026-11-16)

Reverse encoding (AIM 6.5 as Studio runs it; §13) of the old juicebox's **entities** admin module into `juicebar.entities` and its nine children, from the old juicebox (master) and the backend as they are now. Added in Studio through Amy in one change (ten new files and the root's Children line, each checked against the local file by hash before it was approved), followed by one change of two files where three statements did not match the screens as built, and on 2026-11-17 by one change of four files for the owner's answers to the questions below. The lib's code was built the same day from the accepted intent, and the bindings name it.

**Confirmed.** On 2026-11-17 the owner had his approval recorded in Studio ("Record Mario's approval of the customers module"): every file's frontmatter carries `approved_by: Mario` and `approved_at: 2026-11-17`. The `provenance: inferred` lines inside the Bindings blocks stay.

## Files

| File | Holds |
|---|---|
| `aim/juicebar/entities/juicebar.entities.aim` | the module's shared rules (ENTROLE, ENTORG, ENTPROTECT, ENTTYPES, ENTNAME, ENTCOUNTRY, ENTAMG); the personas `CustomerEditor`, `CustomerAdmin`, `CustomerSuperAdmin`; the Records `Customer`, `CustomerAddress`, `CustomerGroup`, `CustomerType`, `ListColumn`, `AttributeField`, `Wallet`, `CustomerFile`, `FileFacts`; the Capabilities `WalletLedger`, `MailHistory`, `PushHistory`, `PaymentAccounts` |
| `list/` | the listing by type with its filters, deleting from it, and the customers in the admin's search |
| `groups/` | the customer groups dialog: add, rename, delete |
| `create/` | the create page, with the organisation form |
| `details/` | an opened customer's tabs and its pages without a tab, the Details tab, and the addresses |
| `attributes/` | a customer's attribute values, and adding and deleting the attribute fields of a type |
| `media/` | a customer's files on the Media tab, and the two older pages without a tab: the customer's form files and its images |
| `wallets/` | a customer's wallets on the ledger |
| `messages/` | the e-mail history and the push notifications |
| `organisation/` | an organisation's payment account and fees, and its API keys |
| `aim/juicebar/juicebar.aim` | one Children line |

## Method and scope

**Read:**

- The old juicebox, `juicejs/juicebox` master at `c6cca1640`: `src/app/entities/**` (module, routes, service, listing, group dialogs, wizard, the details shell and its twelve tab components with their dialogs, the dictionary), the sidebar entry in `generator/modules.json` (`entities`, `entities:role`, `fa-address-book`), the confirmation dialog and `helper.service.ts#prepareSearchTerm`. Quality Circle's copy (`quality-circle/apps/juicebox`) differs from master only by having no wallets.
- The backend, `juicejs/juice-modules` master at `b823636d`: `packages/juice/src/modules/entities/EntityService.ts` (the remotable methods the admin calls, with the permission each asks for), `managed/ManagedEntity.ts` (what an update stores), `models/Entity.ts`.

**Left out on purpose:**

- The note "Mjesto za download button" (a developer's placeholder) on the old images page.
- The wallet's "restore" button and its QR dialog: the old button is always disabled.
- The tabs other modules of a project add to a customer (tickets, purchases, participations, licence history, bookings, vouchers): a project adds them with `componentOverrides`, each with its label and the permission or role that shows it. The old tab bar named them itself.
- The framework: the sidebar entry, the breadcrumb, the split view's compact list, the table's paginator.

**Kept for a project's own modules:** the service methods only other old modules call (`updateFooter`, `addMedia`, `removeMedia`, `fetchFileUrl`, `fetchImage`, `returnAsset`, `getWalletRestore`, the Stripe account links), under their old names; the service and its types are exported.

**Kept although nothing leads to them** (the owner's ruling, 2026-11-17: other projects may link to them): the routes `documents-entity` (a customer's form files), `addlogo-entity` (a customer's images) and `prices-entity` (a placeholder in the old admin too, kept as it is; a project with prices puts its own page there through `componentOverrides`). None of the 210 client branches of the old juicebox links to them or changed them.

## Modelling notes

- **Project titles became options.** The old tab bar chose tabs by the project's title (Equipments, QC-Assets, the three Carl Stahl admins). The root's CONFIG rule forbids that, so the tabs are named by the project: `hiddenTabs` (attributes, wallets, push-notifications, payment) and `extraTabs` (media, api-access). Without options a customer shows what the old admin showed a project with none of those titles.
- **The backend's own rules are encoded as they are:** adding a group asks for `update`, renaming and deleting one for `delete`; adding an attribute field asks for `create` while its button shows for `admin`; an update keeps a text field's stored value when it is sent empty; the listing is always limited to the staff member's organisation, while `strictTenancy` only governs opening, changing and deleting.
- Attribute values and an organisation's attributes are `map(string)`: they hold any JSON under keys the project configures, which a `part(...)` would refuse.
- The e-mails and push notifications are read through Capabilities and have no Record: other services keep them.
- Uploading a form file goes to the forms module's own address (`/forms/upload/<form entry>`), modelled as the Capability `FormUploads`.

## Where the lib differs from the old admin, on purpose

Kept exactly: every backend call, its arguments and payloads (a salutation, gender or country never chosen is still sent as an empty list; the header filters send the old search terms), the permissions each button asks for, the page sizes and the default sort.

Fixed, because the old code crashed, lost data or did nothing visible:

- **Creating an organisation.** The old page showed the customer form on a form that did not exist and read the wrong form on Create; the organisation form now shows for the type Organisation and is what is sent. Changing the type no longer empties the fields typed so far.
- **The Details tab's country.** The first address is stored again only when the country was changed (the old tab wrote an empty country into it on every save of a customer without a matching country, and failed after saving a customer without an address); a second change in a row is compared with the country just saved.
- **Attribute values.** A dropdown is bound to its own field (the old one was bound by its label and broke the form where label and name differ); each date field has its own value (they shared one); only changed values are sent (the old tab also sent an empty text for every field never filled in).
- **Media.** The list shows the files of the chosen media type and still does after a change (the old one compared a type with an object and showed empty rows); "Save" waits for a file; the preview no longer fails on a large file; deleting asks in the admin's own dialog instead of the browser's.
- **The listing.** The organisation filter offers the first organisations (the old one skipped as many pages as the listing was on); group names are read once per group; the "Customer group" column shows the names of the row's groups (the old one knew only ten groups); the SAP column shows once (it was there twice).
- **The form files page** shows the pictures and downloads the files (the old page put the file itself where an address belongs, so neither worked) and reads the files again after an upload.
- **The images page** reads the customer and sends the image's bytes (the old page kept the backend's whole answer as the customer and sent the image as an empty object, so it neither listed nor stored one), shows each image by its stored small size, and tells the backend's refusal.
- **Deleting an attribute field** waits for a field to be chosen. **Generating an API key** that fails shows "Operation failed." and stops.
- **Failures are told:** adding, renaming or deleting a group, adding or changing an address, adding or changing a file, and saving an organisation's fees show the backend's reason; saving the fees shows "Success!". The old screens showed nothing.
- **Names from the configuration** (customer types, media types, attribute fields) show as they are where the dictionary has no text for them; the old admin showed them after "@".
- The countries are named in the admin's language everywhere (the create page and the address dialogs used the English list).
- The breadcrumb leads to the listing from every tab (the Address tab's pointed at `/main/invitations`).

## After the code review (2026-11-17)

- The review's worry that the unsaved-changes question is skipped when another customer is opened from the compact list did not hold: Angular 22's router gives a tab its record's id, so the question is asked. A test now covers it, for customers and for locations.
- The compact list shows a customer's e-mail address only as the type's own column does: hidden until pointed at, or not at all.
- Holding Enter in the customer groups dialog adds one group, not several.
- A customer in more than ten groups shows all of them in the Group field.
- An organisation's fee that was not changed is sent back as it is stored, also one stored as a text.
- An image is sent as the request's body, as a file of the Media tab is.
- The listing reads the attribute fields once and not at all as the compact list; a late answer no longer sets the listing's buttons or a customer's header on another page.
- Left as it is, on the owner's ruling: the organisation form sends "Customer only visible for me" as the settings give it without showing the switch, as the old page's code does. Quality Circle's copy of the page is the same; it creates its organisations in its own organisations module, which sends no such value.

## The owner's answers (2026-11-17)

1. **The three unlinked routes** are kept: projects the owner does not have locally may use them.
2. **Groups, wallets and API keys are deleted without a question**, as in the old admin. Kept.
3. **A salutation, gender or country never chosen is sent as an empty list**, as the old page sent it. Kept.
4. **A user's organisations tab** opens the customers module's create page with the one type Organisation, as the old admin did. A project without the customers module keeps the users module's own dialog, since it has no such page.

## Framework changes made along the way

- The admin's search no longer stays empty when one module's search fails: that module has no results and the others show, as in the old juicebox (`JuiceboxService.doSearch`). Found on Quality Circle's staging, where the users search answers with an error.
- `EntitiesService` is exported, so a project's modules can register listing buttons (`addCustomActionButton`).
