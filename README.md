# Nora App

**N.O.R.A. — Notas, Organización, Registros y Administración.**

Android assistant for technicians: customers, estimates with materials/labor, and PDFs to share.

## Current state

Android app with example home tasks and working local customer/estimate CRUD screens. Bottom tabs: Customers · Home · Estimates. Both domains have searchable lists, a circular add button, full details and separate create/edit forms. Customers archive/restore; only draft estimates can be edited/deleted. Confirmations protect destructive actions and unsaved changes. UUID entities and SQLite persistence remain offline, with no account/backend/ads. Light terracotta/olive palette and semantic theme tokens. The user tested the initial preview in Expo Go; the new CRUD, native keyboard/back behavior and persistence after restarting Android still need device validation.

Manifest: Angular 22, Angular Native 0.7, Expo SDK 57, React Native 0.86, TypeScript 6, Vitest 5. Resolved versions: package-lock.json. Native views through Fabric, not Ionic/WebView. Tailwind CSS 4 is configured through @ng-native/tailwind 0.7, Metro and src/styles.css. Global native styles are registered in src/main.ts.

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

English code identifiers/comments; initially Spanish user text. Modern Angular and incremental complete features. Local agents.md and roadmap.md are ignored by Git. Starter AGENTS.md/CLAUDE.md were removed after consolidating useful native rules into agents.md. READMEs are versioned.

[Angular Native](https://ng-native.com/guide/getting-started) · [Nora API](https://github.com/matigaleanodev/nora-api)

## Customer and estimate domain

Domain folders follow the existing Angular projects: `customers/models`, `customers/services`, `estimates/models`, `estimates/services`, and `estimates/utils`; shared entity/UUID contracts and UUID generation live under `shared`. Services expose asynchronous local operations; UI integration is implemented through thin native page components and signal-based page services. Preview tasks remain independent.

Customers support name, optional Argentina phone (area code without 0, subscriber number without 15, ten digits combined, fixed +549 formatting, WhatsApp flag), multiple named addresses, optional email and notes. Customer/address/item/estimate IDs use UUID; Expo Crypto generates UUID v4. Customers can be archived/restored rather than deleted, preserving references. Name and address display name are required; other address fields may remain incomplete.

Estimates reference a customer and optional customer address, with a separate unique user-supplied display number, description, material/labor items, ARS/USD, optional validity date (YYYY-MM-DD) and public notes. Units: m, m², m³, liters, units, hours and complete job. Drafts may have no items; sending requires at least one. Drafts can be edited/deleted, then transition to sent and accepted/rejected. A customer/address snapshot is copied when saving a draft and remains unchanged once sent; later customer edits do not rewrite estimates. No currency conversion, tax, discount, PDF or sending integration is implemented; status is local tracking only.

Prices are nonnegative integer cents. Quantities are positive, at most 1,000,000, with up to three decimals. Subtotals round half-up to cents using integer arithmetic; totals sum rounded subtotals with safe-integer limits. Totals are derived, not stored. Versioned SQLite JSON keys `customers.v1` and `estimates.v1` use the existing local storage service; read-modify-write operations are serialized in this app process, including recovery after errors. This is not multi-process synchronization or cloud backup. Future schemas require explicit migration.

Validation: typecheck and nine tests pass (native UI tests plus domain/persistence-adapter tests). Native CRUD/UUID execution on Android remains to be verified.

## Visual feedback

`NotificationService` in `shared/services` exposes `success(message, options?)`, `warning(...)`, `danger(...)` and `dismiss()`. The global `nora-toast` host sits above the tabs, outside scrolling content. Only the latest toast is shown. Success expires after five seconds; warning/danger remain until dismissed. Override with `{ durationMs: 8000 }`, or use zero for manual dismissal. All variants include a close button and a polite accessibility live region. Colors use existing theme tokens. Task and CRUD flows demonstrate success/error feedback; domain services still reject errors so page services can handle them and invoke notifications without hiding failures. No OS notifications or permissions required. Typecheck and the current suite pass; verify toast rendering on Android.

## Unit tests

Run `npm test` from Ubuntu/WSL. The suite currently has 136 passing cases across twenty-two files, including UI interactions and unit tests for domain/shared services and page flows: local storage, UUID generation, customers, estimates, tasks and notifications. Test descriptions are in Spanish. Tests cover persistence failures, serialized updates, validation, state transitions, snapshots, calculations and toast timers. SQLite and Expo Crypto are mocked; this suite does not prove native database or random-generator execution. `npm run typecheck` also passes.

## Formatting

Prettier uses its standard defaults (`.prettierrc.json`), without plugins. Run `npm run format` to format or `npm run format:check` to verify. VS Code recommends the Prettier extension and enables format on save; install the extension in WSL when developing there. Generated files, dependencies, native builds, coverage, package-lock and local agent/planning files are excluded.

## Mobile CRUD flows

Page components only bind signals and invoke services. `CustomersPageService` and `EstimatesPageService` own list/detail/form state, searches, drafts, native confirmations/back handling, keyboard dismissal and notifications; domain services own validation and persistence. Page services live for the app session so switching tabs preserves an unsaved form. Going back asks before discarding edits. No draft recovery after process termination is implemented.

Forms support multiple customer addresses and estimate items with material/labor, quantity, measurement unit and unit price. Save stays outside the scroll area; keyboard avoidance and Android back use official native APIs. Money input accepts comma or dot as decimal separator with at most two decimals and no thousands grouping. `money` formats stored cents as `$` (ARS) or `US$` (USD) using Argentine separators. Quantities accept three decimals; previews use the same domain subtotal/total rules. Currency selection does not convert existing prices.

Create a customer first, then create an estimate, choose the customer/address and add items. Empty item lists are allowed for drafts. Estimate state changes are local tracking only; PDF generation and sending remain pending. Lists currently use scroll views for the first small offline dataset; virtualized lists can replace them as volume grows.

Validation includes component interactions, domain tests, a full mocked-storage CRUD flow, draft preservation across tabs, native-back source simulation, money formatting and decimal parsing. Android export succeeds; no new CRUD was installed or tested on a physical device during this iteration.

`npm start` explicitly opens Expo Go mode over a tunnel (`expo start --go --tunnel`), avoiding direct access to the WSL NAT address from the phone. Keep the process running and scan the QR inside Expo Go. The tunnel needs internet access and Expo CLI may ask to install @expo/ngrok.

Pages compose reusable presentation components for lists, details, forms and editors. Shared components provide buttons, fields, page layout and the floating add action. Signal inputs and outputs keep presentation separate from page services; component contracts have unit tests.

Customer addresses are edited in a reusable native modal. Changes remain in an isolated draft until confirmation; cancel or Android back discards that draft. Confirming an address updates the customer form; saving the customer persists it. Toasts appear above the bottom tabs.

Native vector icons use @ng-native/icons with Bootstrap Icons and the Expo-compatible react-native-svg version. Decorative icons do not receive touches. WhatsApp is an accessible checkbox beside the phone number, and the floating add button uses a vector plus icon.

Forms provide example placeholders and mark mandatory fields with *. Native contact autofill hints and end-editing events are handled by the shared text field; events without text do not erase an existing value. Estimate validity uses the Android date picker. Calendar dates persist as yyyy-MM-dd and display as dd/MM/yyyy through CalendarDatePipe, without UTC conversion; future document exports must use this same formatter. Device save error reproduction remains pending; development builds log the original error stack.

Development workflow: create feat/, fix/, refactor/, test/, chore/ or docs/ branches from updated main; use Spanish semantic commits type(scope): description and open a PR targeting main. dev mirrors main and must not hold independent work. CI checks formatting, types, unit tests and Android bundle export; it does not produce an APK or publish anything. sync-dev.yml creates dev if missing, attempts fast-forward then merge, and uses a force-with-lease fallback only on conflicts, following the workspace standard. Authentication uses GITHUB_TOKEN with contents:write; an optional DEV_SYNC_PAT enables downstream workflows on the bot push. With GITHUB_TOKEN, the push to dev does not trigger another CI; PR/main CI still runs. Existing branch rules must permit the bot synchronization. Workflows become active after they are pushed.

GitHub state verified on 2026-10-09: remote dev was created from main. main requires a PR (zero required approvals for the solo maintainer), conversation resolution, and applies protection to administrators; force pushes and deletion are blocked. dev blocks deletion and permits direct/force pushes for mirror synchronization, with administrator enforcement disabled. Required CI checks will be configured after the first Actions run.
