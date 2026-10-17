# Nora — Traspaso de diseño a implementación

[English](implementation-handoff.md) · [Identidad](visual-identity.es.md) · [Diseño y UX](ux-guidelines.es.md) · [Kit visual](design-kit/README.es.md)

Guía inicial de diseño del 2026-10-16, actualizada con la revisión del 2026-10-17. El usuario autorizó corregir la primera implementación; el estado actual está en [Implementación y prueba manual](implementation-status.es.md). No se autorizan commits ni publicación automática. Los pendientes futuros no bloquean el desarrollo incremental.

Revisión 2026-10-17: el usuario pidió corregir la primera implementación. Estado actual y validación en [Implementación y prueba manual](implementation-status.es.md). Vigencia y condiciones ahora tiene pantalla dedicada; esta decisión reemplaza el desplegable inicial.

## Referencias y acceso

- [Kit local de pantallas y componentes](design-kit/index.html), [tokens](design-kit/tokens.json) y [paquete preparado para Figma](design-kit/figma-payload.json).
- [Presupuesto de ejemplo para el cliente en PDF](design-kit/nora-presupuesto-ejemplo.pdf) y [plantilla visual HTML](design-kit/nora-presupuesto-ejemplo.html): la marca del trabajador es prioritaria y la de Nora, si aparece, discreta.
- [Símbolo elegido](brand-explorations/nora-icon/03-monogram-v2.png), [variantes vectoriales y splash](brand-explorations/nora-icon/vector-preview/README.es.md) y [presentación de marca](brand-presentation/nora-identidad-visual.pptx).
- Las guías escritas son la referencia de comportamiento; una muestra estática no sustituye sus reglas de recuperación, accesibilidad o persistencia.

**Figma terminado y verificado:** [Nora — Diseño y UX](https://www.figma.com/design/aCVZWB5QOP3spoGNdXhxvx). Contiene 35 vistas base, dos variantes de carga repetida y el PDF A4 editable; 132 controles conectados sin destinos inválidos. Se revisaron visualmente el circuito principal, menú, estados, componentes y documento. La [guía del kit](design-kit/README.es.md) explica las páginas y cómo recorrerlo. El HTML/JSON local y el archivo remoto son entregables diferentes; la validación nativa corresponde al hilo de implementación.

## Base al entregar el diseño y objetivo

| Área         | Base anterior al rediseño                                     | Diseño objetivo                                                                                             |
| ------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Identidad    | Terracota/oliva, marca tipográfica «nora»                     | P1 petróleo `#17645B`, Noto Sans, F1 precisa, firma «Nora» y monograma n                                    |
| Navegación   | Clientes · Inicio · Presupuestos; header global con engranaje | Mismos tres destinos; menú superior derecho y drawer desde derecha; encabezado compacto y volver contextual |
| Inicio       | Tareas ficticias de ejemplo                                   | «Mi negocio», resumen real de borradores/enviados y acceso explícito a sus datos                            |
| Clientes     | Lista, detalle, alta/edición y direcciones                    | Mismos contratos de negocio, interfaz compacta y accesible                                                  |
| Presupuesto  | Formulario con editores inline y guardado manual              | Lista compacta agrupada; editores dedicados de material/mano de obra; carga repetida y autoguardado         |
| Persistencia | `estimates.v1` validado, `customers.v1`, perfil local         | Conservar datos actuales y sumar recuperación de trabajo incompleto sin fingir documento válido             |
| Compartir    | PDF offline y hoja nativa, estados locales separados          | Revisión clara antes de compartir, sin marcar enviado automáticamente                                       |
| Arranque     | Assets/configuración actuales                                 | Marca elegida y movimiento breve del micrófono, sujeto a adaptación Android                                 |

Los mocks de agenda, apariencia u otras funciones futuras no certifican implementación. En el menú de producción sólo se muestran opciones disponibles y contenido real, sin enlaces vacíos.

## Contrato de borrador y recuperación

El `Estimate` actual requiere número, descripción, cliente y snapshot válidos. `EstimatesService` valida esos datos al guardar, y la página actual impide comenzar si no existe un cliente. El nuevo flujo conserva trabajo antes de completarlos: no alcanza con agregar un temporizador al guardado existente.

- Diseñar almacenamiento de edición/recuperación que preserve strings transitorios y un editor no confirmado por separado. Mantener distinto el estado de edición del documento validado y sus snapshots.
- No volver opcionales indiscriminadamente los campos de `Estimate` ni interpretar cantidades/precios incompletos como cero. Definir y probar una migración explícita si se cambia la forma de `estimates.v1`; una clave de recuperación separada también debe tener versión y política de limpieza.
- Mantener identificador estable al reabrir, serializar escrituras y evitar que una escritura anterior sobrescriba una más reciente. El indicador «Guardado en este teléfono» exige confirmación real de SQLite.
- Empezar recuperación con el primer cambio significativo, sin registros vacíos por abrir/cerrar. Recuperar editor interrumpido no incorpora sus valores hasta «Agregar» o «Guardar cambios»; cancelar descarta sólo esa edición.
- Conservar al fallar y ofrecer reintentar. Volver con escritura pendiente/fallida no puede perder cambios silenciosamente. Tras un cierre forzado sólo se garantiza lo que alcanzó a persistirse.
- «Revisar presupuesto» comprueba requisitos del documento y guía al dato faltante. «Compartir PDF» y «Marcar como enviado» permanecen independientes; no cambiar validaciones, redondeos ni snapshots existentes sin una decisión específica.

## Cortes de desarrollo recomendados

1. Aplicar tokens y fuente offline a componentes compartidos; conservar semántica y accesibilidad. Mantener iconografía coherente con la biblioteca nativa existente antes de sumar otra.
2. Implementar shell/encabezados/drawer y navegación Atrás; ocultar tabs en edición/detalle y restaurar búsqueda/posición al volver.
3. Reemplazar Inicio ficticio por Mi negocio con resumen de datos locales reales y formulario manual de datos; no inferir cobros ni entregas.
4. Implementar y probar el contrato persistido de borrador/recuperación compatible antes de habilitar el autoguardado en la interfaz.
5. Rehacer presupuesto y editores dedicados: agrupación/subtotales, agregar/cargar otro, cancelación aislada y revisión explícita. Actualizar clientes usando los mismos componentes.
6. Integrar símbolo final, máscaras y splash Android sin introducir un segundo splash ni una espera artificial.
7. Validar el circuito completo en teléfono y ajustar ergonomía/movimiento con el primer trabajador real.

Leer `agents.md`, reglas de workspace y roadmap al comenzar. Trabajar con Angular Native/Expo, Android y SQLite offline; sin DOM, Ionic ni Capacitor. No implementar agenda, suscripción, backend o IA como efecto colateral del rediseño.

## Verificación

- Para código: `npm run typecheck`, `npm test` y bundle Android según instrucciones vigentes. Cubrir riesgos reales: escritura atrasada/fallida, migración/compatibilidad, reapertura, confirmación/cancelación y estado independiente de compartir.
- Validación nativa separada: teclado y Atrás, reinicio, teléfono con una mano, 1/20/50 renglones, importes largos, texto ampliado, lector de pantalla y movimiento reducido.
- Comprobar logo/perfil, PDF y compartir en dispositivo; las pruebas con módulos simulados y los renders de navegador no demuestran ejecución nativa.
- Validar splash en build instalada: Expo Go no reproduce fielmente el arranque final. Respetar la preferencia nativa de reducir animaciones y continuar si la app ya está lista.
- Cambios sólo de documentación: enlaces locales, paridad ES/EN, trazabilidad de decisiones y assets conservados; no requieren tests de código.

## Alcance por definir

- **Documento para cliente:** el alcance actual es PDF, con referencia visual en el kit; no se requiere Excel para iniciar desarrollo.
- **Excel futuro:** el usuario considera una posible exportación del presupuesto a Excel más adelante. No se definieron columnas, fórmulas ni formato, ni se autorizó implementar esa exportación. No es una plantilla de importación.
- **Figma:** completar construcción y verificar pantallas/capas/conexiones en el archivo creado; no afirmar finalización antes de esa comprobación.
- **Futuro:** tema oscuro, agenda, notificaciones, fotos, backup, firma y asistente por suscripción requieren cortes y alcance propios. Los conceptos visuales no los autorizan.

## Pedido sugerido para el próximo hilo

> Implementemos el rediseño de Nora por cortes pequeños usando `docs/implementation-handoff.es.md`, las guías de identidad/UX y `docs/design-kit/`. Primero revisá el estado actual y proponé el primer corte completo. Preservá los datos locales y cambios preexistentes. No hagas commits ni pushes automáticos; verificá tipos/tests y distinguí validación nativa pendiente. El documento para cliente es PDF; Excel es sólo una posibilidad futura. Verificá el estado documentado de Figma antes de afirmar que el prototipo está terminado.

## Implementación iniciada — 2026-10-16

El pedido de implementación en `feat/visual-identity` autoriza los commits por bloques de documentación y código. El estado actual, las decisiones técnicas y la prueba manual previa a publicar se mantienen en [estado de implementación](implementation-status.es.md). El contenido anterior describe la base de diseño entregada, no limita esta implementación autorizada.
