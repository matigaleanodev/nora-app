# Nora — Design and user experience

[Español](ux-guidelines.es.md) · [Visual identity](visual-identity.md)

Updated: 2026-10-16. Target-design rules for implementation in a separate chat. Includes explicit agreements and routine details resolved under the user's UX delegation; future scope is identified separately. Maintain both translations.

## Confirmed needs

- The current interface feels clumsy and difficult; changing the palette alone is insufficient.
- Replace “ítem” with “material” or “tarea” as appropriate; name the section “Materiales y mano de obra”.
- Estimates may contain many materials and labor tasks. Avoid expanding another inline form for every addition and making the page unwieldy.
- Reposition and clarify back navigation.
- Make the worker or business profile easier to discover; the current gear does not sufficiently convey its purpose.
- Keep primary sections in three bottom destinations; secondary options use a right-side drawer triggered by a top-right hamburger, provisionally until real-use validation.

## Screenshot observations

- The logo, top spacing, introductory phrase, and title occupy substantial screen space before the task starts.
- The circular back button sits apart from the first header row.
- Estimate detail entries use tall cards; many materials will require more scrolling.
- The screenshots also show a floating “Tools” control and an environment overlay. They are excluded from the proposed product navigation; their origin must be verified during implementation.

## Defined navigation

- Accepted the presented foundation: a compact header with back arrow, compact material/labor list, dedicated editor, and repeated entry. Routine details are finalized under the delegation recorded below.
- Rejected “Más” as a fourth bottom destination. The user prefers keeping bottom destinations for primary tasks and evaluating a hamburger-triggered side menu for secondary options.
- Inicio displays “Mi negocio”: a real summary and a button opening the business data form. It replaces the initial screen's fictional tasks; keep the short bottom label “Inicio”.
- Agreed provisional decision: a top-right hamburger on main screens opens a modal drawer from the right. Keep three bottom destinations for primary tasks; reassess ergonomics through real use.
- Agreed future review trigger: if a fourth primary section becomes necessary, reassess bottom navigation and consider placing the menu trigger there while retaining the right-side drawer. This is not an automatic change: compare clarity, space, and reach before deciding.

### Structure and behavior

- Three bottom destinations: Clientes · Inicio (the “Mi negocio” screen) · Presupuestos, preserving the current order. Do not repeat those destinations inside the side menu.
- “Mi negocio” summarizes real information and offers “Editar datos de mi negocio” for name, contact, and logo. Users do not need a formally incorporated business; distinguish the summary from the “Datos de mi negocio” form.
- Initial summary: draft estimates and sent estimates awaiting a response, linking to the relevant estimates. Use local statuses without claiming delivery or reading. Show agenda and upcoming visits only when available; do not show fictional tasks, revenue inferred from estimates, or decorative metrics.
- Following the agreed provisional decision, a modal drawer opens from the right through a top-right hamburger on the three main screens. Reserve it for settings and secondary content; close it before navigating to a selected option.
- Possible future organization: Ajustes (including appearance when available), Ayuda, and Legales. These categories do not authorize new features or empty entries.
- Hidden navigation reduces visibility and requires reaching the header; accept this tradeoff for occasional options while keeping frequent tasks in bottom navigation and business data on the main screen.
- On secondary screens, hide the hamburger and show the back arrow to the left of the title. Android Back or tapping the backdrop closes an open drawer first. Keep accessible focus inside the open drawer and return it to the trigger on close.
- Add other options only when available; do not populate the menu with future or inactive features.
- Use one compact header per screen with a title and relevant actions. On secondary screens, place the back arrow to the left of the title. Avoid repeating the logo, slogan, and title on every form.
- Hide bottom destinations during creation, editing, and detail views to provide space and maintain context. Returning restores the previous section, search, and scroll position.
- Android Back respects context: dismiss the keyboard or selection before leaving. Leaving a modified form requires resolving unsaved changes rather than silently losing them.
- When the business profile is missing, offer a dismissible “Completá los datos de tu negocio” entry on Inicio without blocking app use.

## Estimates

### Vocabulary

- Section: “Materiales y mano de obra”.
- Explicit actions: “Agregar material” and “Agregar mano de obra”.
- Label labor descriptions “Trabajo a realizar”. Refer to “material” or “tarea” when editing or deleting; avoid “ítem” in the interface.
- “Line” can identify the common element in internal documentation; code models do not require renaming.

### List and editor

- Show compact lines with description, quantity/unit, unit price, and subtotal, rather than a full form for each addition.
- Group materials and labor with headings and subtotals, and show a grand total. Make amounts easy to read and compare.
- Tapping a line opens a dedicated editing screen. Adding opens the same editor adapted to the selected type without expanding the main form.
- The editor offers “Agregar”, “Agregar y cargar otro”, and cancel. Editing uses “Guardar cambios”.
- “Agregar y cargar otro” adds the line to the draft, clears fields, and prepares another of the same type. Returning retains previously added lines and resolves changes to the current editor separately.
- Confirming “Agregar” or “Guardar cambios” for a material or task applies the change to the draft and starts local autosave. Report it as saved only after the write is confirmed; cancel preserves the original line.
- Canceling an edit preserves the original line. Deletion must be an explicit action, not depend on discovering a gesture.
- Keep both add actions accessible for repeated entry. Give the total and “Revisar presupuesto” a stable location without covering the last lines or the keyboard. Review leaves the editor for review, validates requirements, and does not send or change status. Do not require manual “Guardar borrador” as the normal persistence mechanism.
- Separate core data (client, description, currency) from “Vigencia y condiciones”, a secondary disclosure preserving access and entered values; its summary indicates when data is present. The visible number remains editable and required when validating the document; do not introduce automatic numbering in this increment.
- Do not introduce a catalog, bulk entry, a step wizard, or new business rules without agreeing on their need.

## Estimate autosave

### Agreed working approach

The user delegates design and UX details that improve the experience within Nora's scope. Document decisions and their rationale without requesting approval for every routine detail. Ask when scope or business rules change, or alternatives have material consequences. This authorization does not include implementing code in this chat.

### Agreed decision

- Autosave the draft locally to reduce manual actions and allow resuming later.
- Saving does not send, share, or automatically change the estimate status. It does not imply remote synchronization or backup.
- This decision applies to estimate drafts; it does not automatically extend autosave to clients, the business profile, or already-sent estimates.

### Defined behavior

- Show a discreet “Guardando…” / “Guardado en este teléfono” indicator rather than a toast for every change. On failure, retain edited data and show “No pudimos guardar los cambios” with a retry action. Never claim success before the write is confirmed.
- Returning after a confirmed save keeps the draft without confirming already-saved changes. Resolve pending or failed writes, or warn before leaving; never silently lose changes.
- Recover saved content when reopening the app. Do not promise recovery of keystrokes not yet persisted if the system terminates the process.
- Separate retaining an incomplete draft from validating it for review or sharing. Create recovery data from the first meaningful change, without requiring a client, description, or final number; opening and closing an untouched form creates no record. The recovery rules below cover incomplete or invalid input.
- Confirming a material or task applies and autosaves its change. Preserve an interrupted editor's fields as separate recovery data without automatically applying them; returning to that editor allows continuation or discard. “Cancelar” removes only this recovery data and preserves the original confirmed value.
- Deleting a draft must be an explicit, confirmed action; going back does not delete it.
- “Revisar presupuesto”, “Compartir PDF”, and “Marcar como enviado” are explicit, independent actions. Review shows the document and specific missing requirements before sharing.

### Defined recovery and validation rules

- Automatically retain incomplete work from the first meaningful user change; opening and closing an unchanged form must not create empty drafts.
- Allow retaining a draft without a client, description, or final number. Show “Presupuesto sin completar” when identification is insufficient, with the last edit date to help recognize it. Future implementation must revisit existing contracts without weakening requirements for an estimate ready to share.
- Preserve transient input, such as an unfinished price, for editing recovery. Do not treat it as a valid amount or compute misleading totals: identify the material or task needing completion.
- Reopening a draft restores persisted content and discreetly indicates incompleteness, without a cascade of errors for fields the user has not finished.
- Show field errors after editing that field when appropriate. Choosing review for sharing checks all document requirements and guides the user to the first problem while retaining other input.
- Review must explain what is missing and how to resolve it; do not leave a disabled action without explanation. Validate the current draft before PDF generation without automatically changing status or sharing.
- Distinguish confirmed lines from their editor input: recovering an interrupted editor does not automatically apply its content to the estimate. Cancel discards only that edit and preserves previously confirmed changes.
- Verify these rules across app closure and reopening during implementation; the saved indicator must reflect actual persistence rather than in-memory state.

## Motion and transitions

### Design principle

Use brief, restrained, functional motion to explain context or state changes. Touch feedback starts immediately; animation must not introduce artificial waits or determine data persistence. Keep motion consistent with Nora's professional, approachable identity.

| Interaction                   | Behavior                                                                                                 |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| Open/close menu               | Panel enters and exits from the right with coordinated backdrop dimming.                                 |
| Open detail/editor and return | Consistent forward and return transitions, preferably using native behavior.                             |
| Switch bottom destination     | Direct change or brief opacity transition; do not imply forward/back navigation between peer sections.   |
| Expand options                | Short expansion/collapse preserving context, with an open/closed indicator.                              |
| Press button                  | Immediate pressed state without moving content or changing the touch target.                             |
| Add/delete material or task   | Brief local transition of the affected line preserving reading position; do not animate the entire list. |
| Autosave and totals           | Discreet indicator change; no celebrations, repeated toasts, or rolling digits.                          |

### Initial timing to validate on device

- Brief feedback: approximately 100–150 ms; visual response starts on touch.
- Local changes and disclosure: approximately 160–220 ms.
- Drawer and context transitions: approximately 220–300 ms, except native or interactive transitions defining their own timing.
- These are Nora design references, not universal durations or rigid requirements. Adapt to distance, content size, keyboard behavior, and actual performance. Prefer gentle deceleration without conspicuous bouncing or overshoot.

### Accessibility and behavior

- Respect system preferences to reduce or remove animations: eliminate large movements and animated expansion; use immediate changes or discreet opacity where appropriate. Preserve content and functionality.
- Transitions must not steal focus, hide errors, or be the only indication of change. Disclosure controls also expose their accessible state.
- Handle repeated taps and reversals without queuing animations, duplicating operations, or blocking the screen for visual reasons.
- Avoid staggered card entrances, continuous decorative motion, parallax, bounce effects, and entrance animations every time a user returns to a list.
- Test with long estimates, an open keyboard, enlarged text, and reduced motion. Simplify effects that stutter or hinder repeated entry.

## Pending validation

### Local references and ergonomics — assessment on 2026-10-16

- Read the navigation components in `modo-playa-app` and `foodly-notes-front`. Both combine three bottom destinations with a right-side drawer and an upper trigger. Modo Playa groups options into sections and includes theme selection; Foodly includes theme and language and duplicates primary destinations in the menu. For Nora, propose preserving the task/secondary-option separation without that duplication.
- The user notes the discomfort of reaching the top and requests independent judgment: their ideas are input, not automatically approved decisions.
- Assessment recommendation: retain the upper menu trigger for occasional options, prioritizing daily navigation, adding, and saving at the bottom. Access to “Mi negocio” from Inicio avoids depending on the menu to edit business data. The top-right trigger and right-side drawer are now provisionally agreed.
- A bottom trigger is possible, but adding it to three destinations competes for space and can resemble a fourth tab; it is not automatically simpler. Do not add another bar or floating menu button without demonstrating need.
- If testing shows frequent menu use, actual difficulty with the upper trigger, or a fourth primary section becomes necessary, compare a distinct bottom trigger. The panel still enters from the right as agreed; do not implement this change preemptively.
- Validate one-handed use with both left and right hands and enlarged text. Do not assume a universal thumb zone; distinguish frequency, reach, and discoverability.

- Apply the defined navigation, vocabulary, and editor; validate understanding and adjust based on usage evidence.
- Test entry and correction of estimates with 1, 20, and 50 lines, including long descriptions, different units, and an open keyboard. These are test scenarios, not product limits.
- Review enlarged text, touch actions, and accessible announcements.
- Check back, cancel, edit, and save without data loss or unexpected position changes.
- Validate with the first real worker that “Mi negocio” and material/labor actions are understandable without explanation.

## Log

- 2026-10-16: consolidated delegated UX rules: Inicio/Mi negocio, separate editor recovery, explicit review, and secondary validity/conditions disclosure. Future scope changes remain open in the handoff.

- 2026-10-16: defined gentle, functional transitions for navigation, drawer, disclosure, and feedback; initial timing requires native validation and respect for reduced motion.

- 2026-10-16: agreed on local estimate draft autosave, separate from sending/sharing; indicators, recovery, and incomplete input are defined in this guide.

- 2026-10-16: provisionally agreed on a top-right menu trigger and drawer entering from that side, retaining three primary bottom destinations. Replaces the initial left-side proposal; subject to usability validation.

- 2026-10-16: received screenshots and feedback on vocabulary, long entry, back navigation, and profile access; solutions are consolidated in the current rules.
- 2026-10-16: accepted the foundation except “Más” as a fourth bottom destination; selected a side menu for secondary options and Inicio/Mi negocio with a summary and data-form access.
