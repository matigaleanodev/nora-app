# Nora — Design implementation handoff

[Español](implementation-handoff.es.md) · [Identity](visual-identity.md) · [Design and UX](ux-guidelines.md) · [Design kit](design-kit/README.md)

Updated: 2026-10-16. This chat defines design and documentation; it does not implement app changes or authorize commits. The foundation supports incremental development in another chat. Future open items do not block that start.

## References and access

- [Local screens and components kit](design-kit/index.html), [tokens](design-kit/tokens.json), and [prepared Figma payload](design-kit/figma-payload.json).
- [Client estimate PDF example](design-kit/nora-presupuesto-ejemplo.pdf) and [visual HTML template](design-kit/nora-presupuesto-ejemplo.html): the worker's brand is primary and Nora's branding, if present, is discreet.
- [Selected symbol](brand-explorations/nora-icon/03-monogram-v2.png), [vector variants and splash](brand-explorations/nora-icon/vector-preview/README.md), and [brand presentation](brand-presentation/nora-identidad-visual.pptx).
- Written guides are authoritative for behavior; a static sample does not replace recovery, accessibility, or persistence rules.

**Figma completed and verified:** [Nora — Diseño y UX](https://www.figma.com/design/aCVZWB5QOP3spoGNdXhxvx). Contains 35 base views, two repeated-entry variants, and the editable A4 PDF; 133 connected controls have no invalid destinations. The main flow, drawer, states, components, and document were visually reviewed. The [kit guide](design-kit/README.md) explains its pages and navigation. Local HTML/JSON and the remote file are different deliverables; native validation belongs to the implementation chat.

## Baseline at design handoff and target

| Area        | Implemented today                                        | Target design                                                                                    |
| ----------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Identity    | Terracotta/olive, lowercase “nora” wordmark              | P1 teal `#17645B`, Noto Sans, precise F1, “Nora” wordmark and n monogram                         |
| Navigation  | Clientes · Inicio · Presupuestos; global header and gear | Same three destinations; top-right trigger and right drawer; compact header and contextual back  |
| Inicio      | Fictional example tasks                                  | “Mi negocio”, real draft/sent summary and explicit business-data access                          |
| Clients     | List, detail, create/edit, and addresses                 | Same business contracts with compact accessible presentation                                     |
| Estimate    | Inline line editors and manual save                      | Grouped compact list; dedicated material/labor editors; repeated entry and autosave              |
| Persistence | Validated `estimates.v1`, `customers.v1`, local profile  | Preserve current data and add incomplete-work recovery without pretending it is a valid document |
| Sharing     | Offline PDF/native sheet, independent local statuses     | Clear review before sharing, without automatically marking sent                                  |
| Startup     | Current assets/configuration                             | Selected mark and brief microphone motion, subject to Android adaptation                         |

Agenda, appearance, and other future mocks do not certify implementation. Production menus contain only available options and real content, without empty links.

## Draft and recovery contract

The current `Estimate` requires valid number, description, client, and snapshot. `EstimatesService` validates these when saving, and the current page blocks creation without a client. The new flow preserves work before these are complete: adding a timer to the existing save is insufficient.

- Design editing/recovery storage preserving transient strings and an unconfirmed editor separately. Keep editing state distinct from the validated document and its snapshots.
- Do not indiscriminately make `Estimate` fields optional or interpret incomplete quantity/price input as zero. Define and test an explicit migration if `estimates.v1` changes shape; a separate recovery key also needs a version and cleanup policy.
- Preserve a stable identifier across reopening, serialize writes, and prevent an earlier write from replacing newer content. “Guardado en este teléfono” requires an actual SQLite confirmation.
- Start recovery on the first meaningful change, without empty records from opening/closing. Recovering an interrupted editor applies nothing until “Agregar” or “Guardar cambios”; cancel discards only that edit.
- Preserve input on failure and offer retry. Returning with a pending/failed write must not silently lose changes. After process termination, only content actually persisted is guaranteed.
- “Revisar presupuesto” checks document requirements and guides users to missing data. “Compartir PDF” and “Marcar como enviado” remain independent; do not change current validation, rounding, or snapshots without a specific decision.

## Recommended development increments

1. Apply tokens and an offline font to shared components; preserve semantics and accessibility. Keep icons coherent with the existing native library before introducing another.
2. Implement shell/headers/drawer and Back behavior; hide bottom destinations in editing/detail views and restore search/position on return.
3. Replace fictional Inicio with Mi negocio using real local summaries and the manually saved data form; do not infer payments or deliveries.
4. Implement and test compatible persisted draft/recovery contracts before enabling interface autosave.
5. Rebuild estimates and dedicated editors: groups/subtotals, add/add another, isolated cancel, and explicit review. Update client screens using the same components.
6. Integrate the final symbol, launcher masks, and Android splash without a second splash or artificial delay.
7. Validate the complete flow on a phone and adjust ergonomics/motion with the first real worker.

Read `agents.md`, workspace rules, and roadmap when starting. Use Angular Native/Expo, Android, and offline SQLite; no DOM, Ionic, or Capacitor. Do not implement agenda, subscriptions, backend, or AI as a side effect of the redesign.

## Verification

- For code: `npm run typecheck`, `npm test`, and Android bundle under current instructions. Cover real risks: delayed/failed writes, migration/compatibility, reopening, confirm/cancel, and sharing's independent status.
- Separate native validation: keyboard and Back, restart, one-handed use, 1/20/50 lines, long amounts, enlarged text, screen reader, and reduced motion.
- Verify logo/profile, PDF, and sharing on device; mocked modules and browser renders do not prove native execution.
- Validate splash in an installed build: Expo Go does not faithfully reproduce final startup. Respect native reduced-motion preferences and continue when the app is ready.
- Documentation-only changes: local links, ES/EN parity, decision traceability, and retained assets; code tests are unnecessary.

## Scope to define

- **Client document:** current scope is PDF with a visual reference in the kit; Excel is not required to start implementation.
- **Future Excel:** the user is considering a later estimate export to Excel. No columns, formulas, or format were defined, and implementation was not authorized. This is not an import template.
- **Figma:** finish construction and verify screens/layers/connections in the created file; do not claim completion before this check.
- **Future:** dark mode, agenda, notifications, photos, backup, signatures, and subscription assistant need their own increments and scope. Visual concepts do not authorize them.

## Suggested request for the next chat

> Implement Nora's redesign in small increments using `docs/implementation-handoff.md`, the identity/UX guides, and `docs/design-kit/`. First inspect the current state and propose a complete first increment. Preserve local data and pre-existing changes. Do not commit or push automatically; verify types/tests and distinguish pending native validation. The client document is PDF; Excel is only a future possibility. Check Figma's documented status before claiming the prototype is complete.

## Implementation started — 2026-10-16

The implementation request for `feat/visual-identity` authorizes separate documentation and code commits. Current status, technical decisions and manual checks before publishing are maintained in [implementation status](implementation-status.md). Earlier content describes the delivered design baseline and does not limit this authorized implementation.
