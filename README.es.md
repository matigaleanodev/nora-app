# Nora App

[Identidad visual](docs/visual-identity.es.md) · [Diseño y UX](docs/ux-guidelines.es.md) · [Kit visual](docs/design-kit/README.es.md) · [Traspaso a desarrollo](docs/implementation-handoff.es.md).

**N.O.R.A. — Notas, Organización, Registros y Administración.**

Asistente Android para técnicos: clientes, presupuestos con materiales/mano de obra y PDF para compartir.

## Estado actual

App Android con tareas de ejemplo en Inicio y pantallas CRUD locales de clientes/presupuestos. Tabs inferiores: Clientes · Inicio · Presupuestos. Ambos dominios tienen listas con búsqueda, botón circular para agregar, detalle completo y formularios de creación/edición. Clientes se archivan/restauran; sólo los presupuestos en borrador se editan/eliminan. Confirmaciones protegen acciones destructivas y cambios sin guardar. Entidades UUID y persistencia SQLite offline, sin cuenta/backend/ads. Tema claro terracota/oliva con tokens semánticos. El usuario probó la vista inicial en Expo Go; los nuevos CRUD, teclado/Atrás nativos y persistencia tras reiniciar Android todavía requieren validación en teléfono.

Manifest: Angular 22, Angular Native 0.13.0, Expo SDK 57, React Native 0.86, TypeScript 6 y Vitest 5. Versiones resueltas en package-lock.json. Vistas nativas mediante Fabric, no Ionic/WebView. Tailwind CSS 4 integrado con @ng-native/tailwind 0.13.0, Metro y src/styles.css; estilos globales nativos registrados en src/main.ts.

## Desarrollo Ubuntu/WSL

```bash
cd ~/workspace/Projects/nora-app
npm ci
npm run typecheck
npm test
npm start
```

npm run android inicia Metro y solicita dispositivo/emulador Android. ADB debe ser accesible desde WSL y el teléfono debe llegar a Metro. Expo Go requiere SDK compatible y módulos incluidos; de lo contrario, development build. Estos comandos no generan APK release firmado.

Entrada: src/main.ts. Raíz: src/app/app.ts. Pruebas de interacción: src/app/app.test.ts. Metro: metro.config.js. Metadatos: app.json.

## Alcance previsto

V1 gratuita, offline, guardado local persistente, sin cuenta ni ads. Primer flujo: cliente → ítems → totales → guardar → PDF/compartir. Exportación/importación manual para portabilidad. Primer tester: el papá del dueño.

Después: fotos/ubicación, recordatorios y biometría opcional. Etapa paga con base remota, backup/recuperación y sync entre dispositivos mediante nora-api, conservando uso local gratuito. Biometría y autenticación de cuenta son distintas. Ads futuros sólo con banners pequeños fuera de edición/PDF/compartir. Puente Modo Playa como posibilidad futura.

## Convenciones

Identificadores en inglés; comentarios, documentación de código y tests en español. Angular moderno y features completas incrementales. agents.md y roadmap.md locales ignorados por Git. AGENTS.md/CLAUDE.md del starter eliminados tras consolidar reglas nativas útiles en agents.md. README y traducción se versionan.

[Angular Native](https://ng-native.com/guide/getting-started) · [Nora API](https://github.com/matigaleanodev/nora-api)

## Dominio de clientes y presupuestos

Carpetas por dominio como en los otros Angular: `customers/models`, `customers/services`, `estimates/models`, `estimates/services` y `estimates/utils`; contratos de entidad/UUID y generación de UUID en `shared`. Los servicios exponen operaciones locales asíncronas; la UI se conecta mediante componentes nativos delgados y servicios de página basados en signals. Las tareas de ejemplo siguen independientes.

Clientes con nombre, teléfono argentino opcional (código de área sin 0, número sin 15, diez dígitos combinados, formato fijo +549 e indicador WhatsApp), múltiples direcciones con nombre, email y notas opcionales. Clientes, direcciones, ítems y presupuestos usan UUID; Expo Crypto genera UUID v4. Los clientes se archivan/restauran en lugar de eliminarse para preservar referencias. Nombre y nombre visible de dirección obligatorios; los demás campos de dirección pueden quedar incompletos.

Presupuestos con referencia al cliente y dirección opcional, número visible único ingresado por el usuario, descripción, ítems de materiales/mano de obra, ARS/USD, vigencia opcional (YYYY-MM-DD) y notas públicas. Unidades: m, m², m³, litros, unidades, horas y trabajo completo. Los borradores admiten lista vacía; enviar requiere al menos un ítem. Se pueden editar/eliminar borradores; luego pasan a enviado y aceptado/rechazado. Al guardar el borrador se copia el cliente/dirección; esa copia queda fija al enviarlo. Editar el cliente después no reescribe presupuestos. Sin conversión de moneda, impuestos ni descuentos; PDF/compartir disponible y estado sólo para seguimiento local.

Precios en centavos enteros no negativos. Cantidades positivas, máximo 1.000.000, hasta tres decimales. Cada subtotal redondea mitades hacia arriba a centavos mediante aritmética entera; el total suma subtotales redondeados, con límites de enteros seguros. Los totales se calculan, no se guardan. Claves JSON SQLite versionadas `customers.v1` y `estimates.v1` sobre storage existente; operaciones de lectura/modificación/escritura serializadas dentro del proceso, recuperables tras errores. No es sincronización entre procesos ni backup remoto. Futuros esquemas requieren migración explícita.

Validación: typecheck y suite actual correctos (interacciones nativas y dominio/adaptador de persistencia). Falta verificar los nuevos CRUD/UUID nativos en Android.

## Feedback visual

`NotificationService` en `shared/services` expone `success(message, options?)`, `warning(...)`, `danger(...)` y `dismiss()`. El componente global `nora-toast` aparece sobre las tabs, fuera del contenido desplazable. Sólo se muestra el último aviso. Success desaparece a los cinco segundos; warning/danger permanecen hasta cerrarlos. Se puede configurar `{ durationMs: 8000 }`, o cero para cierre manual. Todas las variantes incluyen botón de cierre y anuncio accesible no interruptivo. Colores basados en los tokens existentes. Las tareas y los CRUD muestran feedback de éxito/error; los servicios de dominio siguen rechazando errores para que los servicios de página puedan manejarlos y mostrar avisos sin ocultar fallos. Sin notificaciones del sistema ni permisos. Typecheck y suite actual correctos; falta verificar renderizado de toasts en Android.

## Pruebas unitarias

Ejecutar `npm test` desde Ubuntu/WSL. La suite tiene 186 casos correctos en veintisiete archivos, con interacciones de UI y pruebas unitarias para servicios de dominio/compartidos y flujos de página: storage local, generación de UUID, clientes, presupuestos, tareas y notificaciones. Descripciones de casos en español. Cubren errores de persistencia, actualizaciones serializadas, validaciones, estados, snapshots, cálculos y temporizadores de toasts. SQLite, Expo Crypto, Print, Sharing y FileSystem están simulados: esta suite no demuestra su ejecución nativa en el teléfono. `npm run typecheck` también correcto.

## Formato

Prettier usa sus valores estándar (`.prettierrc.json`), sin plugins. Ejecutar `npm run format` para formatear o `npm run format:check` para verificar. VS Code recomienda la extensión Prettier y activa formato al guardar; instalar la extensión en WSL al desarrollar ahí. Se excluyen generados, dependencias, builds nativos, cobertura, package-lock e instrucciones/planificación locales.

## Flujos CRUD móviles

Los componentes de página sólo enlazan signals y llaman servicios. `CustomersPageService` y `EstimatesPageService` administran lista/detalle/formulario, búsquedas, borradores, confirmaciones/Atrás nativos, cierre de teclado y notificaciones; los servicios de dominio validan y persisten. Los servicios de página viven durante la sesión de la app, por lo que cambiar de tab conserva formularios sin guardar. Volver pide confirmar antes de descartar cambios. No hay recuperación de formularios tras terminar el proceso.

Formularios con direcciones múltiples e ítems de materiales/mano de obra, cantidad, unidad y precio unitario. Guardar queda fuera del scroll; adaptación al teclado y Atrás Android mediante APIs nativas oficiales. Precios admiten coma o punto decimal, hasta dos decimales y sin separadores de miles. El pipe `money` muestra centavos como `$` (ARS) o `US$` (USD), con formato argentino. Cantidades de tres decimales; parciales y totales usan las mismas reglas del dominio. Cambiar moneda no convierte precios existentes.

Crear un cliente primero; después preparar el presupuesto, seleccionar cliente/dirección y agregar ítems. Los borradores admiten lista de ítems vacía. Estados de presupuesto sólo para seguimiento local; compartir PDF es una acción independiente y no confirma entrega. Listas con scroll para el primer conjunto pequeño offline; se pueden virtualizar al crecer el volumen.

Validación con interacciones de componentes, tests de dominio, flujo CRUD completo con storage simulado, conservación de formularios entre tabs, fuente simulada de Atrás nativo, formato monetario y conversión decimal. Export Android correcto; no se instaló ni probó el nuevo CRUD en teléfono durante esta iteración.

`npm start` activa explícitamente Expo Go con túnel (`expo start --go --tunnel`), evitando depender del acceso directo a la dirección NAT de WSL desde el teléfono. Dejar el proceso corriendo y escanear el QR dentro de Expo Go. El túnel requiere internet y Expo CLI puede pedir instalar @expo/ngrok.

Las páginas componen componentes de presentación reutilizables para listas, detalles, formularios y editores. Los componentes compartidos resuelven botones, campos, estructura de página y acción flotante. Signal inputs y outputs separan la presentación de los servicios de página; sus contratos tienen pruebas unitarias.

Las direcciones se editan en un modal nativo reutilizable. Los cambios quedan en un borrador aislado hasta confirmar; cancelar o volver desde Android descarta ese borrador. Confirmar la dirección actualiza el formulario; guardar el cliente la persiste. Los toasts aparecen sobre las tabs inferiores.

Los íconos vectoriales nativos usan @ng-native/icons con Bootstrap Icons y react-native-svg compatible con Expo. Los íconos decorativos no reciben toques. WhatsApp es un checkbox accesible junto al número de teléfono, y el botón flotante usa un ícono vectorial de suma.

Los formularios incluyen ejemplos y marcan los campos obligatorios con *. El campo compartido configura autocompletado nativo de contacto y captura el fin de edición; los eventos sin texto no borran valores existentes. La vigencia usa el calendario de Android. Las fechas de calendario se guardan como yyyy-MM-dd y muestran dd/MM/yyyy mediante CalendarDatePipe, sin conversión UTC; los futuros documentos deben reutilizar este formato. Sigue pendiente reproducir el fallo de guardado del teléfono; desarrollo registra el stack original.

Flujo de desarrollo: crear ramas feat/, fix/, refactor/, test/, chore/ o docs/ desde main actualizado; usar commits semánticos en español type(scope): descripción y abrir PR hacia main. dev refleja main y no debe contener trabajo independiente. CI verifica formato, tipos, unitarios y exportación del bundle Android; no genera APK ni publica. sync-dev.yml crea dev si falta, intenta fast-forward y luego merge, y usa force-with-lease sólo ante conflictos, según el estándar del workspace. Usa GITHUB_TOKEN con contents:write; DEV_SYNC_PAT opcional permite disparar workflows desde el push del bot. Con GITHUB_TOKEN ese push a dev no dispara otro CI; los de PR/main sí se ejecutan. Las reglas de ramas deben permitir la sincronización del bot. Los workflows se activan al subirlos.

Estado GitHub verificado al 2026-10-09: dev remota creada desde main. main exige PR (cero aprobaciones obligatorias para el mantenimiento individual), resolución de conversaciones y aplica protección a administradores; bloquea push forzado y borrado. dev bloquea borrado y permite pushes directos/forzados para sincronizar el espejo, sin enforcement de administradores. El check de GitHub Actions «Formato, tipos, tests y bundle Android» es obligatorio en main, con la rama actualizada antes del merge.

## Mi negocio

El engranaje del header abre el perfil del prestador: nombre o nombre comercial obligatorio, teléfono argentino, email y logo opcionales. Se guarda localmente en SQLite bajo `business-profile.v1`; el logo se copia al directorio privado durable `business-logos` al guardar. Admite JPG, PNG y WebP de hasta 5 MB. Cancelar la selección conserva el logo anterior; reemplazarlo elimina la copia anterior sólo después de guardar correctamente. Los originales de la galería se conservan.

Los componentes de contacto se comparten con clientes. Los servicios separan validación/persistencia, archivos nativos y estado de pantalla. Volver confirma cambios sin guardar y conserva la pantalla anterior. El perfil actual aporta nombre, contacto y logo opcional del prestador para generar el PDF.

Validación: 158 tests en 25 archivos, typecheck y export Android correctos. Falta probar selección del logo y persistencia del perfil/logo al reiniciar Expo Go en el teléfono.

## Actualizaciones del framework

Seguir de cerca Angular Native es una finalidad principal de este repositorio. Actualizar sus paquetes juntos en una rama feat dedicada con el migrador oficial, revisar releases y notas de migración, y verificar tipos, tests, formato y export Android. Antes del merge, probar formularios, teclado, navegación, modales, toasts y persistencia local en el teléfono. La migración 0.7.0 → 0.13.0 sólo cambió versiones de paquetes; Expo, React Native y Angular conservan sus líneas actuales. La integración del inspector queda como otro incremento.

Validación del 2026-10-14: tipos, 158 tests, formato y export Android correctos con 0.13.0. Falta la prueba de regresión en teléfono.

## PDF del presupuesto y compartir

Desde el detalle de un presupuesto guardado, **Compartir PDF** genera un documento A4 offline mediante `expo-print` y abre el menú nativo de Android con `expo-sharing`. Primero completar el nombre obligatorio en Mi negocio. El documento incluye snapshot del cliente/dirección, perfil actual del negocio y logo opcional incrustado, descripción, materiales/mano de obra con cantidades/unidades, precios, parciales, total, ARS/USD, vigencia dd/MM/yyyy y notas públicas. Los borradores salen marcados BORRADOR, incluso si no tienen ítems. Los cálculos del dominio conservan el mismo redondeo en centavos de la app. Los textos se escapan y el documento no carga recursos externos.

`EstimatePdfService` resuelve generación/archivos/share nativos; la plantilla HTML es una utilidad pura y los componentes sólo emiten acciones al servicio de página. Una copia privada con nombre único queda en `cache/estimate-pdfs` para que la app receptora termine de leerla. Nuevas exportaciones limpian las copias de más de 24 horas; el sistema puede liberar la caché antes. Esto no es backup ni archivo documental permanente. Los datos del prestador se leen al exportar; no son un snapshot histórico inmutable.

Compartir no elige el contacto de WhatsApp, no confirma entrega ni cambia el estado. Elegir app/contacto y marcar como enviado son acciones separadas. Un error conserva el detalle y permite reintentar; mientras está ocupado se bloquean solicitudes repetidas.

Validación: 186 tests en 27 archivos, tipos, formato y export Android correctos. Muestras PDF de Chromium revisadas visualmente con una página, 100 ítems y notas/descripciones extensas. Falta validar impresión, logo, paginación y compartir a otra app en Expo Go/Android real.
