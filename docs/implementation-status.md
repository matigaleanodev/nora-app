# Nora — Identity implementation and manual checks

[Español](implementation-status.es.md) · [Handoff](implementation-handoff.md)

2026-10-16 · Local branch `feat/visual-identity`. Manual testing is required before publishing.

## Implemented

- P1 petroleum, T2 offline Noto Sans in four static weights and F1: 16 dp insets, 8 dp radii and minimum 48 dp touch targets. Bootstrap Icons remains the single native icon library.
- Approved monogram rasterized without redrawing for launcher, adaptive mask, monochrome icon and white splash. `scripts/prepare-fonts.py` derives weights from the kit's licensed variable font (`uv run --with fonttools python scripts/prepare-fonts.py`).
- One compact header, right modal drawer, real help and about content; three tabs only on primary screens. Search and scroll position survive returning within each section.
- Home uses real business and estimate data, including incomplete drafts. No fictional tasks or estimates treated as income.
- Materials/labor grouped with subtotals; dedicated editor, isolated cancellation and repeated entry. Validity/conditions are a separate disclosure. Review validates and retains a document; sharing and marking sent remain independent.
- Recovery in `estimate-recovery.v1`: incomplete text, unconfirmed editor, stable UUID and serialized writes. No changes to `estimates.v1`, `customers.v1` or `business-profile.v1`. Unreadable recovery is preserved and cannot be overwritten; failed writes retain the form and require retry before leaving.
- A4 PDF generated with `pdf-lib`/`@pdf-lib/fontkit`, fully embedded Noto Sans, pagination and domain totals. No Expo Print/WebView dependency. The app checks the file header and size before opening `expo-sharing`; WebP logos are converted locally to PNG. Private cache retained for up to 24 hours, without changing estimate status.

## Evidence and limits

The reported failure was “No pudimos generar el PDF”: the previous implementation received a missing or empty file. Installed Expo Print 57.0.2 starts writing without awaiting Android's layout callback; this is a possible cause, not a confirmed reproduction on a phone. The new engine removes that native step. Fontkit subsetting omitted Noto Sans glyphs in real previews; embedding the complete static font corrected this.

Automated verification: typecheck, 181 tests across 28 files, global formatting and Android bundle pass (four offline fonts, 5.9 MB Hermes bundle). Real engine PDFs were rendered at one page and with 50 lines plus extensive notes, and A4 metadata was inspected. This does not validate Android execution.

Production splash uses the approved static image and hides when the app is ready, without a second splash or artificial delay. The exploratory microphone motion was not translated to native CSS animation: Android does not execute that SVG. Check integration in an installed build; Expo Go does not reproduce the final launcher or splash. App transitions respect reduced motion. TalkBack focus, ergonomics, enlarged text and phone keyboard behavior remain pending.

## Manual testing before publishing

1. Start with `npm start -- --clear`. Check empty/populated Home, dismiss the drawer using the backdrop and Android Back, open Help, About and business data. Verify no duplicate headers or tabs in editing/details.
2. Create/edit a customer with addresses, save and return. Confirm search and scroll restoration. Check gallery logo selection and profile/logo persistence after restart.
3. Open/close an untouched estimate: no empty recovery should appear. Start without a customer or number, enter a description and wait for “Guardado en este teléfono”. Restart the app and continue the same draft from Estimates.
4. Add materials and labor with repeated entry. Interrupt a price such as `12,`, return and resume the pending editor. Invalid entries must not be incorporated; cancellation preserves the previous material/task. Check explicit deletion.
5. Review missing data, then complete it. Check ARS/USD, cents, decimal quantities, validity and conditions. Returning after autosave retains changes; pending recovery must not share an older document instead.
6. Share PDFs without logos and with PNG/JPEG/WebP logos. Open the file in another app, send it to a test contact, cancel/retry the chooser. Sharing must not mark sent. Test 1, 20 and 50 lines, long names/amounts and extensive notes.
7. Test enlarged system text, TalkBack, reduced motion, keyboard and one-handed use. Actions must remain accessible and the last lines unobstructed.
8. In an installed Android build, check the Nora name, normal/adaptive/monochrome icons and splash. This is separate from Expo Go validation. Publish the branch only after the user's manual approval.
