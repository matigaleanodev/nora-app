# Nora — Design kit and Figma

[Español](README.es.md) · [Identity](../visual-identity.md) · [Design and UX](../ux-guidelines.md) · [Implementation handoff](../implementation-handoff.md)

Updated: 2026-10-17. Reference for the P1 + T2 + F1 target design with fictional data. It does not describe already implemented screens or change application code.

## View in Figma

Completed file: [Nora — Diseño y UX](https://www.figma.com/design/aCVZWB5QOP3spoGNdXhxvx). Verified on 2026-10-17: 35 base views and two repeated-entry variants, 460 editable texts, 158 instances, and 132 connected controls without invalid destinations. Includes 39 variables, five text styles, and 15 main components with 12 button variants. The A4 document contains 41 editable texts.

Three-page structure adapted to the current Figma plan's limit:

| Page                       | Purpose                                                                      |
| -------------------------- | ---------------------------------------------------------------------------- |
| 00 · Identidad y documento | Palette, typography, geometry, brand, shared rules, and client PDF reference |
| 01 · Componentes           | Buttons, fields, rows, states, and reusable elements                         |
| 02 · Pantallas y flujos    | Sections for the primary flow, recovery/states, and future proposals         |

In **02**, the primary flow includes Inicio/Mi negocio, clients, business data, and estimates; states cover empty screens, pending/failed saves, incomplete work, and recovery. The future section separates agenda, appearance, backup, and assistant concepts without implementation approval. This organization does not require a plan upgrade.

To inspect the design, open the file and choose a page in the side list. Select a frame to inspect its layers, text, and measurements; zoom to selection for comfortable reading. The intended starting point is **Mi negocio** (`home`) in **02 · Pantallas y flujos**.

To explore the prototype, select that frame and open **Present ▶**, or [open the flow directly](https://www.figma.com/proto/aCVZWB5QOP3spoGNdXhxvx?node-id=8-2&starting-point-node-id=8%3A2). The connected flow is Mi negocio → Nuevo presupuesto → Elegir cliente → Agregar material/mano de obra → Revisar → Compartir. “Agregar y cargar otro” opens a fresh-entry variant. Tabs, the right drawer, and back navigation are connected. Nine starting points cover the main flow, empty screens, errors, incomplete work, recovery, and future concepts. Destinations and visual samples were checked; the prototype does not persist data or run SQLite, PDF, WhatsApp, or AI.

## Local reference

- [index.html](index.html): local viewer for comparing screens and following the reference flow without a backend. Open it in a browser from the file explorer; the design remains available without Figma access.
- [tokens.json](tokens.json): palette, typography, geometry, and motion timing. Native geometry values are dp and scalable base type values are sp; the HTML preview approximates them rather than certifying native measurements.
- [figma-payload.json](figma-payload.json): structure for 35 target screens: 24 in the primary flow, 7 states, and 4 future concepts. Includes 109 specified routes; this is not a claim of verified remote connections. `category: current` identifies the current target flow, not features already implemented today.
- [nora-presupuesto-ejemplo.pdf](nora-presupuesto-ejemplo.pdf) and [its HTML template](nora-presupuesto-ejemplo.html): reference for the estimate delivered to a client. Prioritize the worker's identity, materials/labor, amounts, total, and conditions; Nora stays secondary if included.
- `figma-import/`: final remote-node IDs and verification record. The provisional importer was removed; there is no plugin to install or code to import into Nora's runtime.

Written guides define behavior, persistence, and business rules. The kit supports visual review and provides a starting point; native controls, keyboards, safe areas, and enlarged text may require adjustments.

## Boundaries and next steps

- **Client document:** PDF only for now. Excel remains a possible future estimate export; no workbook, columns, formulas, format, or implementation were created. No import template was designed.
- **Future:** the four concepts do not authorize dark mode, agenda, backup, or a subscription assistant. Define scope before implementation; do not add inactive entries to current navigation.
- **Native:** implement with Angular Native/Expo, Android, and offline SQLite. HTML/Figma transitions are not production code; bundle Noto Sans and adapt the splash to the native mechanism, validating an installed build.
- **Persistence:** follow the handoff's recovery contract; autosave preserves incomplete work without silently making it a validated estimate.
- **Validation:** test a phone, keyboard/Back, 1/20/50 lines, enlarged text, and reduced motion. Figma does not replace these checks.
