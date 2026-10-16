# Nora — Identidad visual y tono

[English](visual-identity.md)

Actualizado: 2026-10-16. Base de identidad definida para implementar en otro hilo. Esta guía registra el diseño objetivo; no describe cambios ya aplicados a la app.

## Mantenimiento

Actualizar esta guía y su traducción a medida que se acuerden decisiones. Separar lo acordado de las propuestas y pendientes: elegir una dirección no aprueba todos los detalles de una muestra. Si cambia una decisión, reemplazar la regla vigente y registrar el cambio al final.

## Decisiones acordadas

### Público y personalidad

- Dirigida a pequeños trabajadores y personas que trabajan por su cuenta, con una agenda chica de clientes.
- Profesional y sobria: discreta, ordenada y cuidada.
- Cercana y práctica, acorde al contexto del trabajador independiente.
- Tono entre formal e informal, sin llegar a ninguno de los extremos.
- La profesionalidad se expresa mediante claridad y consistencia; evitar una voz excesivamente corporativa o distante.

### Dirección de color

- Verde petróleo como dirección principal de marca.
- Base clara de blanco y grises neutros, sin matices crema, oliva u ocre como identidad dominante.
- Abandonar la combinación inicial de terracota, oliva, crema y ocre: el usuario la percibe como sepia y antigua.
- Combinación aprobada el 2026-10-16: **P1 + T2 + F1**. Las reglas vigentes se detallan a continuación; las demás alternativas se conservan sólo como referencia.

### Base visual aprobada: P1 + T2 + F1

- **P1 · Petróleo equilibrado:** marca `#17645B`, selección suave `#E7F2EF`, fondo `#F7F8FA`, superficie/texto sobre marca `#FFFFFF`, texto principal `#202938`, texto secundario `#526071` y separador decorativo `#D4DAE0`.
- **T2 · Noto Sans:** familia única para la interfaz, empaquetada para funcionar offline. Tamaños base de texto escalables (sp): títulos 24, secciones 18, contenido/campos/botones 16, etiquetas/ayudas 14 y total destacado 28. Pesos: lectura 400, etiquetas/acciones 500–600 y títulos/importes 600–700.
- **F1 · Precisa:** radio base de controles/contenedores 8 dp, margen horizontal 16 dp, padding vertical de renglones 12 dp y separación de secciones 16 dp. Estados compactos pueden usar radio 6 dp; botones flotantes pueden ser circulares.
- Mantener lectura cómoda y áreas táctiles Android de al menos 48 × 48 dp. Controles principales: altura base 52 dp, ampliable con el texto. La densidad compacta reduce espacio sobrante, no legibilidad ni accesibilidad.
- Íconos de trazo simple con tamaño visual base 24 dp y estilo coherente, sombras mínimas y renglones que puedan crecer con el contenido. La biblioteca definitiva de iconografía queda pendiente.
- Estados semánticos: éxito `#256B3E` sobre `#EDF7F1`, advertencia `#8A5700` sobre `#FFF4DB`, error `#B42318` sobre `#FDECE9`, siempre acompañados de texto o ícono.
- Las combinaciones de texto de las muestras se comprobaron con contraste de al menos 4.5:1; cada componente y sus estados finales deben validarse en la implementación. Los separadores suaves no deben ser el único indicador de un control.
- La elección define la base visual del tema claro; no aprueba por sí sola toda la distribución o el comportamiento de la muestra.

## Reglas de aplicación y tono

Estas reglas concretan la dirección elegida y los detalles de UX delegados por el usuario.

- Concentrar el verde en acciones principales y selecciones, con superficies mayormente neutras.
- Usar Noto Sans con la jerarquía aprobada para títulos, datos e importes.
- Aplicar geometría F1, separaciones claras y sombras mínimas.
- Lenguaje directo y cotidiano; voseo argentino natural y moderado, sin jerga técnica ni familiaridad forzada.
- Ejemplos de voz: «Nuevo presupuesto», «Guardar cliente», «Todavía no agregaste clientes».
- Priorizar encontrar un cliente y continuar un trabajo, con información proporcional a una agenda pequeña.
- Acompañar los estados de éxito, advertencia y error con texto o íconos, además del color.
- Mantener una identidad consistente entre la app, el ícono y el splash. En el PDF para cliente, priorizar nombre, contacto y logo del trabajador; la marca de Nora, si se incluye, es discreta y secundaria.

### Paleta P1 aprobada

Referencia resumida de la paleta aprobada; validar contraste en los usos finales de cada componente:

| Rol                      | Color     |
| ------------------------ | --------- |
| Marca y acción principal | `#17645B` |
| Selección suave          | `#E7F2EF` |
| Fondo                    | `#F7F8FA` |
| Superficie               | `#FFFFFF` |
| Texto principal          | `#202938` |
| Texto secundario         | `#526071` |

## Alternativas evaluadas — referencia histórica

Presentadas el 2026-10-16. El usuario eligió **P1 + T2 + F1**. P2, P3, T1, T3, F2 y F3 no son opciones vigentes para implementar. Las tablas siguientes preservan la comparación, sin reemplazar la base aprobada.

### Paleta

| Rol                          | P1 · Petróleo equilibrado | P2 · Petróleo profundo | P3 · Verde fresco |
| ---------------------------- | ------------------------- | ---------------------- | ----------------- |
| Marca/acción principal       | `#17645B`                 | `#124E46`              | `#08796E`         |
| Selección suave              | `#E7F2EF`                 | `#E7EFED`              | `#E3F5F1`         |
| Fondo                        | `#F7F8FA`                 | `#F5F7F7`              | `#F7FAFA`         |
| Superficie/texto sobre marca | `#FFFFFF`                 | `#FFFFFF`              | `#FFFFFF`         |
| Texto principal              | `#202938`                 | `#1D2927`              | `#18312D`         |
| Texto secundario             | `#526071`                 | `#4E615D`              | `#4E625E`         |
| Borde decorativo/separador   | `#D4DAE0`                 | `#D1DCD8`              | `#CCDCD7`         |

- P1: equilibrio entre sobriedad y cercanía; conserva el verde de la muestra inicial.
- P2: verde más oscuro y contenido; mayor sensación de seriedad.
- P3: verde más vivo, manteniendo superficies neutras; mayor energía visual.
- Estados comunes propuestos: éxito `#256B3E` sobre `#EDF7F1`, advertencia `#8A5700` sobre `#FFF4DB`, error `#B42318` sobre `#FDECE9`. Diferenciar éxito de selección de marca mediante texto e ícono, no sólo por el tono verde.
- Los bordes suaves son decorativos: no bastan como único indicador de un campo o control. Definir sus estados y contornos accesibles al diseñar componentes.
- Estas opciones cubren el tema claro. El tema oscuro requiere una paleta propia con roles equivalentes y contraste validado.

### Tipografía

| Opción | Familia única para la interfaz | Intención visual                                  |
| ------ | ------------------------------ | ------------------------------------------------- |
| T1     | Source Sans 3                  | Cercana y práctica; recomendada para Nora.        |
| T2     | Noto Sans                      | Neutral y sobria.                                 |
| T3     | Manrope                        | Más geométrica y con mayor personalidad de marca. |

Escala inicial común para comparar familias: títulos de pantalla 24, secciones 18, contenido/campos/botones 16, etiquetas/ayudas 14 y total destacado 28. Pesos 400 para lectura, 500–600 para etiquetas/acciones y 600–700 para títulos/importes. Son tamaños base escalables con la preferencia del teléfono, no alturas rígidas. Usar cifras tabulares en columnas de importes cuando la fuente lo permita. En la implementación nativa, empaquetar la fuente elegida para funcionar offline; no depender de Google Fonts en ejecución.

### Formas y densidad

| Opción           | Radio de controles y contenedores | Margen horizontal base | Padding vertical de renglones | Separación de secciones |
| ---------------- | --------------------------------- | ---------------------- | ----------------------------- | ----------------------- |
| F1 · Precisa     | 8                                 | 16                     | 12                            | 16                      |
| F2 · Equilibrada | 12                                | 20                     | 16                            | 20                      |
| F3 · Amplia      | 18                                | 24                     | 20                            | 24                      |

Valores en dp para geometría nativa; ajustar márgenes en pantallas pequeñas. F1 prioriza información visible; F2 equilibra lectura y espacio; F3 ofrece más aire a cambio de desplazamiento adicional. Mantener el mismo radio por rol, no forzarlo en todos los elementos: estados compactos pueden usar 6 y un botón flotante puede ser circular.

En las tres opciones: áreas táctiles de al menos 48 × 48 dp en Android, controles principales de altura base 52 dp que puedan crecer con el texto, íconos de trazo simple con tamaño visual base 24 dp y estilo coherente, sombras mínimas y ausencia de altura fija para textos/renglones. Preferir agrupaciones y separadores a una tarjeta grande por material. La densidad nunca reduce el tamaño de lectura ni el área táctil mínima.

## Símbolo y aplicaciones de marca

[Variantes SVG y prototipo de splash animado](brand-explorations/nora-icon/vector-preview/README.es.md): principal blanco/petróleo e invertido petróleo/blanco, conservando la misma silueta. Escribir **Nora** en textos y firma, conservando la **n minúscula** del símbolo. Para el splash claro, la dirección de movimiento es una aparición breve y un balanceo mínimo del micrófono, una sola vez, con alternativa estática para movimiento reducido. El prototipo es referencia de diseño: assets finales e integración nativa requieren validación durante la implementación.

Exploración del ícono: [registro de prompts y selección](brand-explorations/nora-icon/prompts.md), generados el 2026-10-16. El usuario eligió el [refinamiento v2](brand-explorations/nora-icon/03-monogram-v2.png): monograma abstracto de cabeza femenina/headset y «n» minúscula, simple y poco redondeado, conservando la doble lectura de letra y personaje. [Prompt del refinamiento](brand-explorations/nora-icon/03-monogram-v2-prompt.md). Las cuatro imágenes previas se eliminaron por pedido del usuario; los prompts permanecen como historial. Preparar assets finales y validar máscaras sin rediseñar el símbolo elegido.

[Presentación visual de la marca](brand-presentation/nora-identidad-visual.pptx): seis láminas con símbolo, paleta, Noto Sans, formas precisas y propuestas de ícono/splash. [Vista general](brand-presentation/nora-presentacion.png). La presentación conserva el dibujo elegido y no reemplaza los assets de la app.

Contexto futuro declarado por el usuario: una versión con suscripción mediante Google Play podría incluir un asistente que ayude a armar presupuestos con pocas indicaciones. Esta intención da sentido a la metáfora de Nora como asistente, sin afirmar que hoy exista bot, conversación por voz ni atención humana. No modifica el alcance actual ni autoriza implementar suscripciones o asistencia en este hilo.

Las reglas vigentes se desarrollan en [Diseño y experiencia de usuario](ux-guidelines.es.md). El [kit visual local](design-kit/README.es.md) reúne pantallas y componentes de referencia; el [traspaso a desarrollo](implementation-handoff.es.md) separa estado actual, diseño objetivo y pasos de implementación.

## Pendientes acotados

- Preparar assets finales de ícono y splash; validar contornos, máscaras y arranque nativo en una build instalada.
- Elegir la biblioteca definitiva de iconografía y validar los estados visuales de los componentes.
- Definir el alcance del tema oscuro.
- Adaptar la [referencia visual del PDF para cliente](design-kit/nora-presupuesto-ejemplo.pdf) a la generación nativa, respetando la identidad del trabajador.
- Una posible exportación del presupuesto a Excel es futura; no se definieron columnas, fórmulas, formato ni implementación. El alcance actual del documento para cliente es PDF.

## Registro de decisiones

- 2026-10-16: elegido el monograma v2 y eliminadas las imágenes descartadas. Splash con aparición breve y movimiento casi imperceptible del micrófono; traspaso y kit visual preparados. Figma terminado: identidad, componentes, pantallas, estados, conceptos futuros, prototipo conectado y PDF editable. Desarrollo listo para comenzar en otro hilo, con validación nativa pendiente.

- 2026-10-16: aprobada P1 + T2 + F1: petróleo equilibrado, Noto Sans y formas precisas. Paleta, tipografía y geometría base dejan de estar pendientes de elección.

- 2026-10-16: elegida una personalidad profesional y sobria; descartada la dirección cromática inicial por su sensación sepia/antigua.
- 2026-10-16: elegido verde petróleo; aclarado el público de pequeños trabajadores con pocos clientes y un tono intermedio entre formal e informal.
- 2026-10-16: acordado documentar progresivamente las decisiones y resolver el código en otro hilo.
