# Encoding report part: communications (2026-11-11)

Reverse encoding (AIM 6.4, §13) of the **communications** admin module into `juicebar.communications` and six children, from the old juicebox and the backend as they are now (the owner's ruling). The lib has no realization yet: the bindings name the backend's methods and the old admin's screens, to be re-pointed to the lib once it is built. Every `.aim` file carries `provenance: inferred`. No code was changed.

## Files

| File | Characters | Holds |
|---|---:|---|
| `aim/juicebar/communications/juicebar.communications.aim` | 20,331 | the module: shared requirements, the Personas `CommunicationStaff` and `CommunicationSuperAdmin`, the tab page `View: CommunicationsPage`, the backend's run `Operation: RunCommunication`, `Event: EmailSendFailed`, the Records `Communication`, `Recipient`, `ScheduledTime`, `Content`, `HistoryEntry`, `TaskQueue`, `DeliveryResult`, and the Capabilities `MessageDelivery`, `RecipientProviders`, `CustomerDirectory`, `FormCustomers` |
| `send/juicebar.communications.send.aim` | 11,049 | the quick send tool |
| `recipients/juicebar.communications.recipients.aim` | 13,578 | the selection types and their forms (quick send and automation), an automation's recipients and the recipient dialog |
| `contents/juicebar.communications.contents.aim` | 12,136 | the contents list, creating, changing with the placeholder reference, deleting |
| `automation/juicebar.communications.automation.aim` | 14,982 | the automations list, creating, start/stop, delete, Run, the opened automation and its Send |
| `schedule/juicebar.communications.schedule.aim` | 6,703 | the schedule dialog and the backend's timed run |
| `history/juicebar.communications.history.aim` | 2,114 | the history of runs |
| **Total** | **80,893** | |

For Studio's ~55k limit per import message: change 1 = index + send + schedule + history (40,197); change 2 = recipients + contents + automation (40,696).

Root `## Children` line to add (after locations):

```
- [communications](./communications/juicebar.communications.aim) — the messages sent to customers by e-mail, push notification or SMS: quick sends, contents, automations and their history
```

## Method and scope

**Read:**

- The functional reference: the old juicebox, `juicejs/juicebox` branch master at `c6cca1640` (2026-04-15), `src/app/communications/**` (all 83 files: tabs, quick send tool and its six recipient selectors, contents listing/create/edit/placeholders, automation listing/create/details/recipients/recipient dialog and its five forms, schedule dialog with pending and queue lists, history with its info dialog, channel selector, i18n dictionary, `communications.service.ts`, `communications.route.module.ts`, `communications.module.ts`, `extensions/`).
- The shared pieces communications relies on: `src/app/shared/listing/listing.component.ts` (page size 10), `src/guards/tab-permissions.guard.ts`, `src/guards/unsaved-changes.guard.ts`, `src/app/HasPermissionHideDirective.ts`, `src/services/Juicebox.service.ts#hasPermission`, `src/app/shared/confirmation-dialog/*`, `src/app/entities/entities.service.ts`, `src/app/deh-forms/forms.service.ts`, `src/services/configuration.service.ts`, the sidebar registration in `src/app/main/main.component.module.ts`, and `@ng-select/ng-select` 8 (`change` fires before `add`, so the selectors' parameters are current).
- The backend, Juice 4.4.0 (`juicejs/juice-modules` at `fd8c5961`), from the clean copy of `packages/juice/src/modules/communications/**`: `CommunicationService.ts` (34 remotable methods and their `RemotableUserSessionFilter`s, the role's permissions in `onConfigure`), `modules/Communications.ts` (events, schedule, the 20-second timer, event runs), `components/SendingCommunicationProcess.ts`, the channels, the recipient providers, the models, `validators/Validators.ts`, `mailing/Mailing.ts#renderTemplate` (Handlebars). At the same commit: `packages/juice/src/modules/entities/EntityService.ts` (`fetchEntities`, `fetchEntityGroups`, `searchAttributeValues`, `collectAttributeValues`), `packages/deh/src/forms/FormService.ts`, `juicebox/EntitiesFormService.ts` and `provider/FormProvider.ts` (the DEH FormsService's `ticketing:forms#fetch|search|getForm` and `forms:entities#fetch`, all `forms:role`), `packages/juicebox/src/services/configuration/ConfigurationService.ts` (`getByKey`, `getBySchema`), `packages/juice/src/modules/users/filter/RemotableUserSessionFilter.ts`.
- Juice 3: `@juicejs/communications` 7.0.0 at `03a0461` (`src/communications/CommunicationService.ts`): the same 34 methods with the same filters (13 session-only, 19 `communication:role`, 2 `communication:role` + `send`) and the same answers. It is not modelled twice: the service key `communication-service` is the same, so the bindings hold for both.
- Context only: `juice-modules/packages/juice/reports/modules/communications/2026-10-13-security-audit.md`. Its H1/H2 findings (session-only endpoints, no organisation check by id) are encoded as current behaviour in SESSIONONLY and COMMORG; nothing is "fixed".

**Left out on purpose:**

- Quality Circle's additions (contents export, test send, organisation-aware Save/Delete). QC adds them itself; `quality-circle/aim/qc/communications` was not read.
- The framework: the sidebar entry, the breadcrumb (`navigationEvent`), the look of the tabs, the juicebox option that switches the unsaved-changes question off, the editor's configuration (`ANGULAR_EDITOR_CONFIG`), the `ui-components`.
- Other modules' use of the module's parts: marketing's push communication (reuses the channel selector and the quick recipients), the customer page's History and Push notifications tabs (`entities/details`). They belong to those modules' intents.
- Dead or unreachable parts of the old admin: the history info dialog (its button is commented out and the dialog is empty), the recipients panel's reuse mode (`@Input recipients`, used nowhere), the commented-out detail tabs, queues button and Run confirmation, the "AMG Guest" placeholder table (not in the choice), the unused `models` list of `ContentEditComponent`, the copy-on-click stub of the placeholders, and the leftover "Recipients" box in the quick recipients (question 6).
- Backend methods the admin never calls: `referenceContent`, `getQueueByParam`, `fetchQueues`, `setContentActive` (the two session-only ones are named in SESSIONONLY). The admin's `getRunning` call names a method that does not exist (question 2).
- The mailing providers (SendGrid, SMTP, Brevo), their histories, the SMS providers and the notification service: behind `Capability: MessageDelivery`.
- A content's `archived` and `active` fields and a communication's `bcc`, `attachments` and `payload` as fields: only other modules set them (the communication's own data is named in RUN).

**Binding locators:**

- `juicebox:<path>#<symbol>` — the old admin, path relative to the juicejs/juicebox repository root (branch master). To be re-pointed to `projects/juicebar/src/lib/...` once the lib has the module.
- `service:<juice service>#<method>` — a remotable backend method: `communication-service`, `entities`, `ticketing:forms`, `forms:entities`, `juicebox:configuration:service`.
- `juice-modules:<path>#<symbol>` — backend code that is no remotable method (the run, the timer, event runs, the channels, the provider interface, the models), path relative to the juicejs/juice-modules repository root at `fd8c5961`. This scheme is new in the tree; an unknown scheme is valid (§9).

## Modelling notes

- **The run** is one Operation in the index, `RunCommunication`, since four places start it: QuickSend, SendCommunication (Run in the list and Send on the opened automation), the scheduled time (in ScheduleCommunication's Ensures) and a system event (EVENTRUN). No Trigger is used: the 20-second timer looks at times staff choose, so it is described in SCHEDRUN; the local checker also takes no Trigger edges.
- **ROLES** is satisfied only by operations whose backend method needs `communication:role`: PreviewRecipients (also `send`), QuickSend, AddRecipient, UpdateRecipient, RemoveRecipient, SwitchCommunication, DeleteCommunication, SendCommunication, UpdateCommunication, ScheduleCommunication, CancelScheduledTime.
- **SESSIONONLY** is satisfied by the operations whose method needs only a session — CreateCommunication, CreateContent, UpdateContent, DeleteContent — whose Authz names `juicebar.core#Persona:Staff`, and by the reads in views (channels, events, an automation, contents) and the progress reads in QuickSend and SendCommunication (`getQueue`).
- Role-only reads sit in the views' bindings and satisfy no ROLES: `fetchCommunications`, `fetchScheduleForCommunication`, `getCommunicationQueues`, `getCommunicationsHistory`, `getContentTags`, `searchRecipients`, `getReceiverSupportedSelectionTypes` (also `send`).
- Other root requirements: UILABELS on `View: CommunicationsPage`; CONFIG on QuickSend (`communications:tabs`), ContentList (`amgshop`) and RecipientDialog (`amg_communications`). LANG is not touched: names, subjects and texts are one text, not per language.
- The old admin hard-codes some English words ("You must include a name.", "Cancel", "Add", "Your sure you want to delete this?", "MANUAL TRIGGERED", "Error"/"error"). The intent keeps the words; UILABELS has the lib put them in its dictionary. The old dictionary (`communications_dictionary.ts`) is supplied material for the lib's.
- Customers and users are not modelled: their ids are plain `string` (Recipient.customerIDs, HistoryEntry.user_id), as the Constraints say. `Communication.content` is a plain string, not a `ref(...)`: deleting a content is not refused, and other modules keep text there.
- Behaviour encoded as it is, without a question because the code is clear: the quick send says "sent" when a run ends even if it failed; Run in the list asks nothing while Send on the opened automation asks; deleting a content or a recipient asks nothing; saving a content or an automation shows no notice on success and stores empty fields; a manual automation can't be switched off.
- Backend details with no effect on the admin, not encoded: cancelling a time leaves its status `pending` on the communication (an `ObjectId` compared with `===`); a deleted automation's pending times stay in the configuration and the timer fails on them; saving an automation without a content stores a new random id as its content; the schedule dialog's immediate re-read races the scheduling (SCHEDADD says a new time may show only after reopening).
- Nothing is needed in `juicebar.core`. When customers or users get Records there, the string ids above become references.

## Confidence per intent

| Intent | Confidence | Why |
|---|---|---|
| `juicebar.communications` | high | Permissions read from each method's filter and the role's configuration; the run, the event runs and the channels read from the backend code |
| `juicebar.communications.send` | needs-human-check | Form customers gives no usable recipient (question 3), a leftover box is left out (question 6), attribute values need `entities:role#delete` (question 8) |
| `juicebar.communications.recipients` | needs-human-check | Questions 3, 4, 5 and 7 |
| `juicebar.communications.contents` | high | Read from the listing, the dialogs, the edit page and the backend |
| `juicebar.communications.automation` | high | Read from the listing, the dialogs, the details and the backend; question 2 on restoring progress |
| `juicebar.communications.schedule` | needs-human-check | The started times' list is always empty (question 1); the timer's rules read from `Communications.scheduleInterval` |
| `juicebar.communications.history` | high | Read from the listing and `getCommunicationsHistory` |

## Questions for the owner

The code contradicts itself in these places; each is encoded as it behaves now.

1. **The started times stay empty.** The schedule dialog's second list reads `res.items` (`automation/schedule/queue-listing/queue-listing.component.ts#fetch`), but `getCommunicationQueues` answers `{success, payload}` (`CommunicationService.ts`, the same in `@juicejs/communications`), so the list never shows a run. STARTED encodes it as empty. Should the lib show the started times (time, progress, failed), or leave the list out?
2. **Progress of runs already going when the list opens.** The automation list means to show the progress of runs started before it opened, but `fetchAlreadyRunning` calls `this.communicationsService.getRunning`: neither the property nor the method exists (`listing-communications.component.ts`), so it fails after the rows show. The backend has `getQueueByParam` for this. RUNNOW encodes that only runs started from the open list show progress. Keep that, or show runs already going?
3. **Form customers in the quick send gives no usable recipient.** With "Select all form customers" on (the default) nothing is given, so Send stays disabled; choosing customers gives `<form id>:<customer ids>`, while the forms provider reads e-mail addresses after the colon (`FormsEmailRecipientProvider.getRecipients`); removing a customer changes nothing (`quick-form-customer.component.ts` has no remove handler). The automation's form gives `<form id>` or `<form id>:<e-mails>`. Should the quick send build its parameters as the automation does?
4. **The automation's form choice.** It first lists the forms 11 to 20 (`form-customers-recipients.component.ts#fetchForms` asks `fetch(1, 10)`, and `FormProvider.fetch` counts pages from 0), and its search sends no terms, so typing always lists the first 10 not archived by name (`_search`). Should it list the first 10 and search the name, as the quick send does?
5. **Firebase Customer list in an automation.** The recipient dialog offers the type but has no form for it (`recepient-modal.component.html`), so such a recipient gets no parameters. Give it the quick send's form, or drop it from the dialog?
6. **A leftover "Recipients" box in the quick send.** Below the selection type's form, `quick-recipients.component.html` has another multiple choice bound to `customers`, `selected`, `update` and `searchCustomers`, which `QuickRecipientsComponent` doesn't have: it lists nothing and typing in it fails. It is left out of the intent. Confirm.
7. **Deleting a recipient deletes its twins.** `deleteRecipient` removes every recipient with the same provider and parameters; its comparison by id never matches (an `ObjectId` against a string). RECLIST encodes this. Keep?
8. **Attribute values from two backend methods.** The quick send reads them with `entities#collectAttributeValues` (the first 20; it needs `entities:role` with `delete`), the automation with `entities#searchAttributeValues` (all; `entities:role` alone). Staff without `delete` get no values in the quick send. Should both use one method?

## The owner's rulings (2026-11-11)

The owner ruled "as suggested" on the questions above. The intent was changed before the lib was built:

1. The started times are shown: each run of a scheduled time with its time, progress, done and failed, newest first, 10 to a page (`getCommunicationQueues` answers in `payload`).
2. A run already going when the automation list opens shows its progress (`getQueueByParam`).
3. The quick send's form customers give parameters as the automation does: `<form id>` with "Select all" on, or `<form id>:` and the chosen customers' e-mail addresses.
4. The automation's form choice lists the first 10 forms and searches their names, as the quick send does.
5. The Firebase Customer list has the quick send's form in an automation too.
6. The leftover "Recipients" box in the quick send stays out.
7. Deleting a recipient still removes its twins: that is the backend's behaviour.
8. Both the quick send and the automation read attribute values with `entities#searchAttributeValues`.
