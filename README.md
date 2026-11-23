# Nora App

[Español](README.es.md)

![Angular 22](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white) ![Angular Native 0.22](https://img.shields.io/badge/Angular_Native-0.22-17645B) ![Expo SDK 57](https://img.shields.io/badge/Expo-SDK_57-000020?logo=expo&logoColor=white) ![React Native 0.86](https://img.shields.io/badge/React_Native-0.86-61DAFB?logo=react&logoColor=black) ![TypeScript 6](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white) ![Vitest](https://img.shields.io/badge/tests-Vitest-6E9F18?logo=vitest&logoColor=white)

**N.O.R.A. — Notas, Organización, Registros y Administración.** Offline Android app for independent technicians: customers, estimates with materials and labor, PDFs to share, an agenda of visits with local reminders and a manual backup. It works without an account, backend or ads.

## What it does

- **Customers:** name, optional Argentine phone, several named addresses, email and notes. They are archived instead of deleted, and offer call, WhatsApp, email and map actions.
- **Estimates:** reference a customer and address, with materials and labor items, ARS or USD, optional validity and public notes. Drafts are editable and autosaved; a sent estimate keeps its customer snapshot.
- **PDF:** an A4 document generated offline and shared through the Android sheet.
- **Agenda:** visits and follow-ups, optionally linked to a customer, with a local reminder. Home shows overdue, today and upcoming visits.
- **My business:** provider name, contact and logo used in every PDF.
- **Backup:** one JSON file with all data, saved or restored from the drawer.

Bottom tabs are Customers, Home and Estimates; the remaining options live in the right drawer.

## Stack and architecture

Angular 22 with standalone components and signals, rendered as native views by Angular Native 0.22.2 through Fabric on Expo SDK 57 and React Native 0.86 (New Architecture). It uses no Ionic, WebView or DOM. Tailwind CSS 4 is integrated through `@ng-native/tailwind` 0.22.2: `metro.config.js` compiles `src/styles.css` and `src/main.ts` registers the generated styles as global native styles. Native CSS is a subset, so browser preflight is not used. Resolved versions live in `package-lock.json`; all `@ng-native/*` packages are updated together.

Components only present state; page services coordinate flows with signals; domain services validate and persist. Data lives in `expo-sqlite` as versioned JSON keys, with read-modify-write operations serialized inside the app. IDs are UUID v4 (`expo-crypto`). PDFs use `pdf-lib` and `@pdf-lib/fontkit` with Noto Sans bundled offline. Reminders use `expo-notifications`; there is no push server.

## Local data

| Key                    | Content                                           |
| ---------------------- | ------------------------------------------------- |
| `customers.v1`         | Customers and their addresses                     |
| `estimates.v1`         | Estimates with items and customer snapshot        |
| `business-profile.v1`  | Provider profile and logo reference               |
| `estimate-recovery.v1` | Incomplete estimate forms and interrupted editors |
| `visits.v1`            | Agenda visits and follow-ups                      |

A schema change requires an explicit migration. Unsaved forms survive tab changes during the session, and going back asks before discarding edits.

## Contracts and limits

**Estimates.** Prices are nonnegative integer cents. Quantities are positive, up to 1,000,000, with up to three decimals; subtotals round half-up and totals sum the rounded subtotals. There is no currency conversion, tax or discount. Estimate status is local tracking only.

**PDF.** Provider data is read at export time. A uniquely named copy stays in `cache/estimate-pdfs` and copies older than 24 hours are removed on later exports. Sharing does not choose a recipient, confirm delivery or change the estimate status.

**Logo.** JPG, PNG or WebP up to 5 MB, copied to the private `business-logos` directory; the gallery original is never modified.

**Contact actions.** `tel:`, `https://wa.me`, `mailto:` and a Google Maps search link.

**Agenda and reminders.** Only pending visits with a future reminder are scheduled. Reminders are scheduled for 08:00 on visits without a time and 30 minutes before otherwise; Android may delay delivery. The native notification identifier is the visit UUID, so rescheduling replaces the previous one; operations on reminders run one at a time and are reconciled on startup, when opening the agenda and after a restore. Notification permission is requested when the first reminder is scheduled; without it, visits are saved without a reminder. Tapping a reminder opens the visit, waiting for any save in progress and respecting unsaved edits. Device calendar sync and estimate-validity reminders are not implemented. Expo Go SDK 57 supports these local reminders; only remote push is unavailable there.

**Backup.** Each `copia-nora-YYYY-MM-DD-<identifier>.json` file uses format version 1 and supports the five keys above and an optional base64 logo. The 40 MiB limit applies to export and import. Before restoring, Nora validates the format, records, logo and uniqueness of IDs and estimate numbers. The logo requires a business profile, is limited to 5 MiB and 16 megapixels, and must work in the PDF. After confirmation, a transaction replaces the local data and Nora rebuilds reminders. The logo path and reminder marker are specific to each installation.

## Local development

```bash
npm ci
npm run typecheck
npm test
npm run format:check
npx expo export --platform android
npm start
```

Node 24 as pinned by `.nvmrc`. `npm start` opens Expo Go over a tunnel (`expo start --go --tunnel`); `npm run android` starts Metro and requests a device or emulator, so ADB must be reachable and the phone must reach Metro. Expo Go needs a matching SDK and included native modules; otherwise use a development build. These commands do not produce a signed release APK.

Entry point: `src/main.ts`; root component: `src/app/app.ts`; metadata: `app.json`. Tests run on a simulated native host and mock SQLite, Crypto, Sharing, FileSystem and Notifications, so they do not prove behavior on a device. CI runs formatting, types, tests and the Android export.

## Android APK

For internal distribution, link the project to EAS and run `npx eas-cli build --platform android --profile preview`. EAS manages Android signing. Keep the `dev.matiasgaleano.nora` package and the same signing key across updates, and increase `android.versionCode` for each distributed version.

For a local test build, use Node 24, JDK 21 and an Android SDK with API 36, Build Tools 36.0.0, NDK 27.1.12297006 and CMake 3.22.1. Set `JAVA_HOME` and `ANDROID_HOME`, then run:

```bash
npm ci
npx expo prebuild --platform android
cd android
./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a,x86_64
adb install -r app/build/outputs/apk/release/app-release.apk
```

In PowerShell, use `.\gradlew.bat :app:assembleRelease '-PreactNativeArchitectures=arm64-v8a,x86_64'`. The local APK uses the generated Expo project's test signing key. For distribution, use the `preview` profile or sign the APK with a private key you can retain for updates. The APK contains Nora's code and assets and runs independently of Metro and Expo Go.

1. Install the APK and open **Mi negocio** from Home to save your name, optional contact information and logo.
2. Add a customer and their addresses. In **Presupuestos**, add materials and labor, review the draft and share the PDF. Change the estimate status manually.
3. In **Agenda**, save a future visit and grant notification permission to receive reminders.
4. Before changing phones, uninstalling or changing signing keys, select **Copia de seguridad → Guardar copia**, choose a folder and keep the JSON file outside Nora. You can also use **Compartir copia** to share it. Expo Go uses its own storage. To transfer that data, export a backup from Expo Go and open it in the installed app.
5. To recover your data, open **Copia de seguridad → Elegir archivo**, select the JSON file and check its summary before confirming. Restoring replaces the records on this phone.

## Documentation

- [Visual identity](docs/visual-identity.md)
- [Design and UX](docs/ux-guidelines.md)
- [Design kit](docs/design-kit/README.md)
- [Contributor and agent instructions](AGENTS.md)
