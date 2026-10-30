# Nora App

[Visual identity](docs/visual-identity.md) · [Design and UX](docs/ux-guidelines.md) · [Design kit](docs/design-kit/README.md).

**N.O.R.A. — Notas, Organización, Registros y Administración.**

Android assistant for technicians: customers, estimates with materials/labor, and PDFs to share.

## Current state

Android app with a real business dashboard, local customer/estimate CRUD, and offline PDF sharing. Bottom tabs: Customers · Home · Estimates; additional options open in the right drawer. Estimates use compact materials/labor lists, dedicated editors, local autosave/recovery, and a separate validity/conditions screen. Customers archive/restore; only draft estimates can be edited/deleted. UUID entities and SQLite persistence remain offline, with no account/backend/ads. The approved visual identity uses deep teal, Noto Sans, and the Nora monogram.

Manifest: Angular 22, Angular Native 0.13.0, Expo SDK 57, React Native 0.86, TypeScript 6, Vitest 5. Resolved versions: package-lock.json. Native views through Fabric, not Ionic/WebView. Tailwind CSS 4 is configured through @ng-native/tailwind 0.13.0, Metro and src/styles.css. Global native styles are registered in src/main.ts.

## Ubuntu/WSL development

```bash
cd ~/workspace/Projects/nora-app
npm ci
npm run typecheck
npm test
npm start
```

npm run android starts Metro and requests an Android device/emulator. ADB must be accessible from WSL; the phone must reach Metro. Expo Go requires a matching SDK and included native modules; otherwise use a development build. These commands do not produce a signed release APK.

Entry: src/main.ts. Root: src/app/app.ts. Interaction tests: src/app/app.test.ts. Metro: metro.config.js. App metadata: app.json.

## Planned scope

V1: free, offline, persistent local data, no account or ads. First flow: customer → estimate items → totals → save → PDF/share. Manual export/import for portability. Initial tester: the owner's father.

Later: photos/location, reminders and optional biometric lock. Paid optional cloud persistence, automatic backup/restore and multi-device sync through nora-api, preserving free local use. Biometrics differs from account authentication. Future ads only as small non-blocking banners outside editing/PDF/share flows. Modo Playa bridge is only a future possibility.

## Conventions

English code identifiers; Spanish comments, code documentation, tests and user text. Modern Angular and incremental complete features. Local agents.md and roadmap.md are ignored by Git. Starter AGENTS.md/CLAUDE.md were removed after consolidating useful native rules into agents.md. READMEs are versioned.

[Angular Native](https://ng-native.com/guide/getting-started) · [Nora API](https://github.com/matigaleanodev/nora-api)

## Customer and estimate domain

Domain folders follow the existing Angular projects: `customers/models`, `customers/services`, `estimates/models`, `estimates/services`, and `estimates/utils`; shared entity/UUID contracts and UUID generation live under `shared`. Services expose asynchronous local operations; UI integration is implemented through thin native page components and signal-based page services. Preview tasks remain independent.

Customers support name, optional Argentina phone (area code without 0, subscriber number without 15, ten digits combined, fixed +549 formatting, WhatsApp flag), multiple named addresses, optional email and notes. Customer/address/item/estimate IDs use UUID; Expo Crypto generates UUID v4. Customers can be archived/restored rather than deleted, preserving references. Name and address display name are required; other address fields may remain incomplete.

Estimates reference a customer and optional customer address, with a separate unique user-supplied display number, description, material/labor items, ARS/USD, optional validity date (YYYY-MM-DD) and public notes. Units: m, m², m³, liters, units, hours and complete job. Drafts may have no items; sending requires at least one. Drafts can be edited/deleted, then transition to sent and accepted/rejected. A customer/address snapshot is copied when saving a draft and remains unchanged once sent; later customer edits do not rewrite estimates. No currency conversion, tax or discount is implemented; PDF sharing is available and status is local tracking only.

Prices are nonnegative integer cents. Quantities are positive, at most 1,000,000, with up to three decimals. Subtotals round half-up to cents using integer arithmetic; totals sum rounded subtotals with safe-integer limits. Totals are derived, not stored. Versioned SQLite JSON keys `customers.v1` and `estimates.v1` use the existing local storage service; read-modify-write operations are serialized in this app process, including recovery after errors. This is not multi-process synchronization or cloud backup. Future schemas require explicit migration.

Validation: typecheck and nine tests pass (native UI tests plus domain/persistence-adapter tests). Native CRUD/UUID execution on Android remains to be verified.

## Visual feedback

`NotificationService` in `shared/services` exposes `success(message, options?)`, `warning(...)`, `danger(...)` and `dismiss()`. The global `nora-toast` host sits above the tabs, outside scrolling content. Only the latest toast is shown. Success expires after five seconds; warning/danger remain until dismissed. Override with `{ durationMs: 8000 }`, or use zero for manual dismissal. All variants include a close button and a polite accessibility live region. Colors use existing theme tokens. Task and CRUD flows demonstrate success/error feedback; domain services still reject errors so page services can handle them and invoke notifications without hiding failures. No OS notifications or permissions required. Typecheck and the current suite pass; verify toast rendering on Android.

## Unit tests

Run `npm test` from Ubuntu/WSL. The suite currently has 195 passing cases across twenty-nine files, including UI interactions and unit tests for domain/shared services and page flows: local storage, UUID generation, customers, estimates, tasks and notifications. Test descriptions are in Spanish. Tests cover persistence failures, serialized updates, validation, state transitions, snapshots, calculations and toast timers. SQLite, Expo Crypto, Print, Sharing and FileSystem are mocked; this suite does not prove their native device execution. `npm run typecheck` also passes.

## Formatting

Prettier uses its standard defaults (`.prettierrc.json`), without plugins. Run `npm run format` to format or `npm run format:check` to verify. VS Code recommends the Prettier extension and enables format on save; install the extension in WSL when developing there. Generated files, dependencies, native builds, coverage, package-lock and local agent/planning files are excluded.

## Mobile CRUD flows

Page components only bind signals and invoke services. `CustomersPageService` and `EstimatesPageService` own list/detail/form state, searches, drafts, native confirmations/back handling, keyboard dismissal and notifications; domain services own validation and persistence. Page services live for the app session so switching tabs preserves an unsaved form. Going back asks before discarding edits. No draft recovery after process termination is implemented.

Forms support multiple customer addresses and estimate items with material/labor, quantity, measurement unit and unit price. Save stays outside the scroll area; keyboard avoidance and Android back use official native APIs. Money input accepts comma or dot as decimal separator with at most two decimals and no thousands grouping. `money` formats stored cents as `$` (ARS) or `US$` (USD) using Argentine separators. Quantities accept three decimals; previews use the same domain subtotal/total rules. Currency selection does not convert existing prices.

Create a customer first, then create an estimate, choose the customer/address and add items. Empty item lists are allowed for drafts. Estimate state changes are local tracking only; PDF sharing is a separate action and does not confirm delivery. Lists currently use scroll views for the first small offline dataset; virtualized lists can replace them as volume grows.

Validation includes component interactions, domain tests, a full mocked-storage CRUD flow, draft preservation across tabs, native-back source simulation, money formatting and decimal parsing. Android export succeeds; no new CRUD was installed or tested on a physical device during this iteration.

`npm start` explicitly opens Expo Go mode over a tunnel (`expo start --go --tunnel`), avoiding direct access to the WSL NAT address from the phone. Keep the process running and scan the QR inside Expo Go. The tunnel needs internet access and Expo CLI may ask to install @expo/ngrok.

Pages compose reusable presentation components for lists, details, forms and editors. Shared components provide buttons, fields, page layout and the floating add action. Signal inputs and outputs keep presentation separate from page services; component contracts have unit tests.

Customer addresses are edited in a reusable native modal. Changes remain in an isolated draft until confirmation; cancel or Android back discards that draft. Confirming an address updates the customer form; saving the customer persists it. Toasts appear above the bottom tabs.

Native vector icons use @ng-native/icons with Bootstrap Icons and the Expo-compatible react-native-svg version. Decorative icons do not receive touches. WhatsApp is an accessible checkbox beside the phone number, and the floating add button uses a vector plus icon.

Forms provide example placeholders and mark mandatory fields with *. Native contact autofill hints and end-editing events are handled by the shared text field; events without text do not erase an existing value. Estimate validity uses the Android date picker. Calendar dates persist as yyyy-MM-dd and display as dd/MM/yyyy through CalendarDatePipe, without UTC conversion; future document exports must use this same formatter. Device save error reproduction remains pending; development builds log the original error stack.

Development workflow: create feat/, fix/, refactor/, test/, chore/ or docs/ branches from updated main; use Spanish semantic commits type(scope): description and open a PR targeting main. dev mirrors main and must not hold independent work. CI checks formatting, types, unit tests and Android bundle export; it does not produce an APK or publish anything. sync-dev.yml creates dev if missing, attempts fast-forward then merge, and uses a force-with-lease fallback only on conflicts, following the workspace standard. Authentication uses GITHUB_TOKEN with contents:write; an optional DEV_SYNC_PAT enables downstream workflows on the bot push. With GITHUB_TOKEN, the push to dev does not trigger another CI; PR/main CI still runs. Existing branch rules must permit the bot synchronization. Workflows become active after they are pushed.

GitHub state verified on 2026-10-09: remote dev was created from main. main requires a PR (zero required approvals for the solo maintainer), conversation resolution, and applies protection to administrators; force pushes and deletion are blocked. dev blocks deletion and permits direct/force pushes for mirror synchronization, with administrator enforcement disabled. The GitHub Actions check “Formato, tipos, tests y bundle Android” is required on main, with the branch up to date before merging.

## My business

The header settings button opens the provider profile: required personal/business name, optional Argentine phone, email and logo. SQLite stores it under `business-profile.v1`; saving copies the logo into the durable private `business-logos` directory. Supported formats: JPG, PNG and WebP, up to 5 MB. Canceling selection preserves the previous logo; replacing it removes the old private copy only after a successful save. Gallery originals remain untouched.

Contact fields are shared with customers. Separate services own validation/persistence, native files and page state. Back navigation confirms unsaved changes and preserves the previous screen. The current profile supplies the provider name, contact and optional logo for PDF generation.

Validation: 158 tests across 25 files, typecheck and Android export pass. Logo selection and profile/logo persistence after restarting Expo Go still require device validation.

## Framework updates

Following Angular Native closely is a primary purpose of this repository. Update its packages together on a dedicated feature branch using the official migrator, inspect release notes and migration notes, then verify types, tests, formatting and Android export. Physical-device checks cover forms, keyboard, navigation, modals, toasts and local persistence before merging. The 0.7.0 → 0.13.0 migration only changed package versions; Expo, React Native and Angular remain on their existing release lines. Inspector integration is a separate increment.

Verification on 2026-10-14: typecheck, 158 tests, formatting and Android export pass on 0.13.0. Physical-device regression testing remains pending.

## Estimate PDF and sharing

From a saved estimate detail, **Compartir PDF** generates an A4 document offline with `pdf-lib` and `@pdf-lib/fontkit` and opens Android sharing through `expo-sharing`. Complete the required provider name in Mi negocio first. The document contains the saved customer/address snapshot, the current business profile and optional embedded logo, work description, materials/labor with quantities and units, unit prices, subtotals, total, ARS/USD, validity in dd/MM/yyyy and public notes. Drafts are marked BORRADOR, including drafts without items. Domain calculations supply the same integer-cent rounding as the app. Text is drawn directly into the PDF; the document loads no external assets.

`EstimatePdfService` handles local assets/files/sharing; the PDF byte builder is a pure utility and components only emit actions to the page service. A private, uniquely named copy stays in `cache/estimate-pdfs` so the receiving app can finish reading it. Later exports remove copies older than 24 hours; the OS can reclaim cache earlier. This is not a backup or permanent document archive. Provider data is read at export time; it is not an immutable historical snapshot.

Sharing does not select the WhatsApp contact, confirm delivery or change estimate status. Select the destination app/contact yourself and mark the estimate sent separately. An error preserves the detail and allows retry; double requests are blocked while busy.


## Visual identity and draft recovery

P1 petroleum + T2 offline Noto Sans + F1 precise. Home/My business uses real data; right drawer and tabs only on the three primary screens. Materials and labor use separate editors, repeated entry and isolated cancellation. `estimate-recovery.v1` retains incomplete text and interrupted editors with stable UUIDs and serialized writes; review validates before creating/updating `estimates.v1`, preserving its contracts.
