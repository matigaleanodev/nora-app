# Nora — Visual identity and voice

[Español](visual-identity.es.md)

Updated: 2026-10-16. Identity foundation defined for implementation in a separate chat. This guide records the target design; it does not describe changes already applied to the app.

## Maintenance

Update this guide and its translation as decisions are agreed. Separate agreed decisions from proposals and open items: choosing a direction does not approve every detail of a sample. When a decision changes, replace the current rule and record the change at the end.

## Agreed decisions

### Audience and personality

- Aimed at small independent service workers and self-employed people managing a small client list.
- Professional and restrained: discreet, orderly, and carefully presented.
- Approachable and practical, suited to an independent worker's context.
- A voice between formal and informal, without reaching either extreme.
- Professionalism comes through clarity and consistency; avoid an excessively corporate or distant voice.

### Color direction

- Deep teal as the main brand color direction.
- A light base of white and neutral grays, without cream, olive, or ochre undertones dominating the identity.
- Move away from the initial terracotta, olive, cream, and ochre combination: the user perceives it as sepia and dated.
- Combination approved on 2026-10-16: **P1 + T2 + F1**. Current rules follow below; other alternatives are retained only as reference.

### Approved visual foundation: P1 + T2 + F1

- **P1 · Balanced teal:** brand `#17645B`, soft selection `#E7F2EF`, background `#F7F8FA`, surface/text on brand `#FFFFFF`, primary text `#202938`, secondary text `#526071`, and decorative divider `#D4DAE0`.
- **T2 · Noto Sans:** a single interface family bundled for offline use. Scalable base text sizes (sp): screen headings 24, sections 18, body/fields/buttons 16, labels/help 14, and featured total 28. Weights: reading 400, labels/actions 500–600, and headings/amounts 600–700.
- **F1 · Precise:** base control/container radius 8 dp, horizontal inset 16 dp, vertical line padding 12 dp, and section gap 16 dp. Compact statuses may use a 6 dp radius; floating action buttons may be circular.
- Preserve comfortable reading and Android touch targets of at least 48 × 48 dp. Primary controls have a base 52 dp height that grows with text. Compact density reduces excess spacing, not readability or accessibility.
- Simple stroke icons with a base visual size of 24 dp and consistent styling, minimal shadows, and lines able to grow with content. The final icon library remains open.
- Semantic statuses: success `#256B3E` on `#EDF7F1`, warning `#8A5700` on `#FFF4DB`, error `#B42318` on `#FDECE9`, always accompanied by text or an icon.
- Sample text pairings were checked at a contrast ratio of at least 4.5:1; final components and their states require implementation validation. Soft dividers must not be the sole indicator of a control.
- The selection defines the light theme's visual foundation; it does not automatically approve the sample's entire layout or behavior.

## Application and voice rules

These rules apply the selected direction and routine UX details delegated by the user.

- Concentrate teal on primary actions and selections, keeping surfaces mostly neutral.
- Use Noto Sans with the approved hierarchy for headings, data, and amounts.
- Apply F1 geometry, clear separation, and minimal shadows.
- Use direct, everyday language and natural, moderate Argentine voseo, without technical jargon or forced familiarity.
- Spanish voice examples: “Nuevo presupuesto”, “Guardar cliente”, “Todavía no agregaste clientes”.
- Prioritize finding a client and continuing a job, with information proportionate to a small client list.
- Pair success, warning, and error colors with text or icons.
- Keep the app, icon, and splash consistent. In the client PDF, prioritize the worker's name, contact, and logo; Nora's branding, if included, is discreet and secondary.

### Approved P1 palette

Summary of the approved palette; validate contrast in each component's final uses:

| Role                     | Color     |
| ------------------------ | --------- |
| Brand and primary action | `#17645B` |
| Soft selection           | `#E7F2EF` |
| Background               | `#F7F8FA` |
| Surface                  | `#FFFFFF` |
| Primary text             | `#202938` |
| Secondary text           | `#526071` |

## Evaluated alternatives — historical reference

Presented on 2026-10-16. The user selected **P1 + T2 + F1**. P2, P3, T1, T3, F2, and F3 are not current implementation choices. The following tables retain the comparison without overriding the approved foundation.

### Palette

| Role                      | P1 · Balanced teal | P2 · Deep teal | P3 · Fresh green |
| ------------------------- | ------------------ | -------------- | ---------------- |
| Brand/primary action      | `#17645B`          | `#124E46`      | `#08796E`        |
| Soft selection            | `#E7F2EF`          | `#E7EFED`      | `#E3F5F1`        |
| Background                | `#F7F8FA`          | `#F5F7F7`      | `#F7FAFA`        |
| Surface/text on brand     | `#FFFFFF`          | `#FFFFFF`      | `#FFFFFF`        |
| Primary text              | `#202938`          | `#1D2927`      | `#18312D`        |
| Secondary text            | `#526071`          | `#4E615D`      | `#4E625E`        |
| Decorative border/divider | `#D4DAE0`          | `#D1DCD8`      | `#CCDCD7`        |

- P1: balances restraint and approachability; retains the initial sample's teal.
- P2: darker, more restrained green with a more serious character.
- P3: livelier green with neutral surfaces and greater visual energy.
- Proposed shared statuses: success `#256B3E` on `#EDF7F1`, warning `#8A5700` on `#FFF4DB`, error `#B42318` on `#FDECE9`. Distinguish success from brand selection through text and icons, not just the green hue.
- Soft borders are decorative and insufficient as a control's sole visual indicator. Define accessible outlines and states when designing components.
- These options cover the light theme. Dark mode needs its own palette with equivalent roles and verified contrast.

### Typography

| Option | Single interface family | Visual intent                                     |
| ------ | ----------------------- | ------------------------------------------------- |
| T1     | Source Sans 3           | Approachable and practical; recommended for Nora. |
| T2     | Noto Sans               | Neutral and restrained.                           |
| T3     | Manrope                 | More geometric, with stronger brand personality.  |

Shared initial scale for comparing families: screen headings 24, sections 18, body/fields/buttons 16, labels/help 14, and featured total 28. Weights: 400 for reading, 500–600 for labels/actions, and 600–700 for headings/amounts. These are base sizes scaled by phone preferences, not rigid heights. Use tabular figures for amount columns where supported by the family. Bundle the selected font during native implementation for offline use; do not depend on Google Fonts at runtime.

### Shapes and density

| Option        | Control/container radius | Base horizontal inset | Vertical line padding | Section gap |
| ------------- | ------------------------ | --------------------- | --------------------- | ----------- |
| F1 · Precise  | 8                        | 16                    | 12                    | 16          |
| F2 · Balanced | 12                       | 20                    | 16                    | 20          |
| F3 · Spacious | 18                       | 24                    | 20                    | 24          |

Geometry values are native dp; adjust insets on small screens. F1 prioritizes visible information; F2 balances reading and space; F3 offers more breathing room with additional scrolling. Keep radii consistent by role rather than forcing one everywhere: compact statuses may use 6 and a floating action button may be circular.

Across all options: at least 48 × 48 dp touch targets on Android, primary controls with a base 52 dp height that can grow with text, simple stroke icons with a base visual size of 24 dp and consistent styling, minimal shadows, and no fixed text/line heights. Prefer grouping and dividers over a large card per material. Density must never reduce reading sizes or minimum touch targets.

## Symbol and brand applications

[SVG variants and animated splash prototype](brand-explorations/nora-icon/vector-preview/README.md): primary white/teal and inverted teal/white, preserving the same silhouette. Write **Nora** in copy and the wordmark, retaining the **lowercase n** symbol. The light splash's motion direction is a brief appearance and minimal microphone movement, once, with a static reduced-motion alternative. This prototype is a design reference: final assets and native integration require implementation validation.

Icon exploration: [prompt and selection record](brand-explorations/nora-icon/prompts.md), generated on 2026-10-16. The user selected [refinement v2](brand-explorations/nora-icon/03-monogram-v2.png): an abstract female head/headset and lowercase “n” monogram, simple and minimally rounded while retaining the letter/character dual reading. [Refinement prompt](brand-explorations/nora-icon/03-monogram-v2-prompt.md). The four earlier images were removed at the user's request; prompts remain as history. Prepare final assets and validate launcher masks without redesigning the selected symbol.

[Visual brand presentation](brand-presentation/nora-identidad-visual.pptx): six slides covering the symbol, palette, Noto Sans, precise shapes, and icon/splash proposals. [Overview](brand-presentation/nora-presentacion.png). The presentation preserves the selected drawing and does not replace app assets.

User-declared future context: a Google Play subscription version could include an assistant helping create estimates from a few instructions. This intention supports Nora's assistant metaphor without claiming a bot, voice interaction, or human support exists today. It does not change current scope or authorize implementing subscriptions or assistance in this chat.

Current rules are detailed in [Design and user experience](ux-guidelines.md). The [local design kit](design-kit/README.md) gathers reference screens and components.

## Bounded open items

- Prepare final icon and splash assets; validate contours, masks, and native startup in an installed build.
- Choose the final icon library and validate component visual states.
- Define dark theme scope.
- Adapt the [client PDF visual reference](design-kit/nora-presupuesto-ejemplo.pdf) to native generation while respecting the worker's identity.
- A possible estimate export to Excel is future scope; no columns, formulas, format, or implementation were defined. Current client-document scope is PDF.

## Decision log

- 2026-10-16: selected the v2 monogram and removed discarded images. Splash includes a brief appearance and almost imperceptible microphone movement; handoff and visual kit are ready. Figma completed: identity, components, screens, states, future concepts, connected prototype, and editable PDF. Implementation can start in a separate chat, with native validation pending.

- 2026-10-16: approved P1 + T2 + F1: balanced teal, Noto Sans, and precise shapes. Palette, typography, and base geometry are no longer awaiting selection.

- 2026-10-16: selected a professional, restrained personality; rejected the initial color direction because it feels sepia and dated.
- 2026-10-16: selected deep teal; clarified the audience as small independent workers with few clients and a voice between formal and informal.
- 2026-10-16: agreed to document decisions progressively and handle implementation in a separate chat.
