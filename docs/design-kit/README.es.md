# Nora — Kit visual y Figma

[English](README.md) · [Identidad](../visual-identity.es.md) · [Diseño y UX](../ux-guidelines.es.md) · [Traspaso a desarrollo](../implementation-handoff.es.md)

Actualizado: 2026-10-16. Referencia del diseño objetivo P1 + T2 + F1, con datos ficticios. No describe pantallas ya implementadas ni cambia el código de la app.

## Ver en Figma

Archivo terminado: [Nora — Diseño y UX](https://www.figma.com/design/aCVZWB5QOP3spoGNdXhxvx). Verificado el 2026-10-16: 35 vistas base y dos variantes de carga repetida, 464 textos editables, 159 instancias y 133 controles conectados, sin destinos inválidos. Incluye 39 variables, cinco estilos tipográficos y 15 componentes principales con 12 variantes de botón. El documento A4 tiene 41 textos editables.

Estructura de tres páginas, adaptada al límite del plan actual de Figma:

| Página | Para qué sirve |
| --- | --- |
| 00 · Identidad y documento | Paleta, tipografía, geometría, marca, reglas comunes y referencia del documento PDF para cliente |
| 01 · Componentes | Botones, campos, filas, estados y elementos reutilizables |
| 02 · Pantallas y flujos | Secciones del circuito principal, estados/recuperación y propuestas futuras |

En **02**, el circuito principal incluye Inicio/Mi negocio, clientes, datos del negocio y presupuesto; los estados cubren vacíos, guardado pendiente/fallido, incompletos y recuperación. La sección futura separa agenda, apariencia, backup y asistente como conceptos sin implementación aprobada. No hace falta ampliar el plan para esta organización.

Para inspeccionar el diseño, abrí el archivo y elegí una página en la lista lateral. Seleccioná un frame para revisar sus capas, textos y medidas; usá ajustar a selección para leerlo cómodamente. El punto de inicio previsto es **Mi negocio** (`home`) en **02 · Pantallas y flujos**.

Para recorrer el prototipo, seleccioná ese frame y abrí **Presentar ▶**, o [abrí el circuito directamente](https://www.figma.com/proto/aCVZWB5QOP3spoGNdXhxvx?node-id=8-2&starting-point-node-id=8%3A2). El circuito conectado es Mi negocio → Nuevo presupuesto → Elegir cliente → Agregar material/mano de obra → Revisar → Compartir. «Agregar y cargar otro» abre una variante con campos listos para una nueva carga. Tabs, menú derecho y volver están conectados. Hay nueve puntos de inicio para el circuito principal, vacíos, error, incompletos, recuperación y conceptos futuros. Se verificaron destinos y muestras visuales; el prototipo no guarda datos ni ejecuta SQLite, PDF, WhatsApp o IA.

## Referencia local

- [index.html](index.html): visor local para comparar pantallas y recorrer el circuito de referencia, sin backend. Se puede abrir desde el explorador de archivos en un navegador; el diseño se conserva aunque no haya acceso a Figma.
- [tokens.json](tokens.json): paleta, tipografía, geometría y ritmo de movimiento. Valores nativos de geometría en dp y tipografía base escalable en sp; la previsualización HTML los aproxima, no certifica mediciones nativas.
- [figma-payload.json](figma-payload.json): estructura de 35 pantallas objetivo: 24 del circuito principal, 7 estados y 4 conceptos futuros. Incluye 110 rutas especificadas; no son una afirmación de conexiones remotas ya verificadas. `category: current` identifica el circuito objetivo actual, no funcionalidad implementada hoy.
- [nora-presupuesto-ejemplo.pdf](nora-presupuesto-ejemplo.pdf) y [su plantilla HTML](nora-presupuesto-ejemplo.html): referencia del presupuesto para entregar al cliente. Priorizar identidad del trabajador, materiales/mano de obra, importes, total y condiciones; Nora permanece secundaria si se incluye.
- `figma-import/`: registro final de IDs y verificación del archivo remoto. Se retiró el importador provisional; no hay un plugin que instalar ni código para importar al runtime de Nora.

Las guías escritas definen comportamiento, persistencia y reglas de negocio. El kit ayuda a revisarlas visualmente y es punto de partida; los controles nativos, teclado, áreas seguras y texto ampliado pueden requerir ajustes.

## Límites y próximos pasos

- **Documento para cliente:** ahora sólo PDF. Excel queda como posible exportación futura del presupuesto; no se generó planilla ni se definieron columnas, fórmulas, formato o implementación. No se diseñó una plantilla de importación.
- **Futuro:** los cuatro conceptos no autorizan tema oscuro, agenda, backup o asistente por suscripción. Definir su alcance antes de desarrollar; no agregar enlaces inactivos a la navegación actual.
- **Nativo:** implementar con Angular Native/Expo, Android y SQLite offline. El HTML y las transiciones Figma no son código productivo; empaquetar Noto Sans y adaptar el splash al mecanismo nativo, validando una build instalada.
- **Persistencia:** respetar el contrato de recuperación del traspaso; el autoguardado conserva trabajo incompleto sin convertirlo silenciosamente en un presupuesto válido.
- **Validación:** probar teléfono, teclado/Atrás, 1/20/50 renglones, texto ampliado y movimiento reducido. Figma no reemplaza esas comprobaciones.
