# Nora App

**N.O.R.A. — Notas, Organización, Registros y Administración.**

Asistente Android para técnicos: clientes, presupuestos con materiales/mano de obra y PDF para compartir.

## Estado actual

App Android con tareas de ejemplo en Inicio y pantallas CRUD locales de clientes/presupuestos. Tabs inferiores: Clientes · Inicio · Presupuestos. Ambos dominios tienen listas con búsqueda, botón circular para agregar, detalle completo y formularios de creación/edición. Clientes se archivan/restauran; sólo los presupuestos en borrador se editan/eliminan. Confirmaciones protegen acciones destructivas y cambios sin guardar. Entidades UUID y persistencia SQLite offline, sin cuenta/backend/ads. Tema claro terracota/oliva con tokens semánticos. El usuario probó la vista inicial en Expo Go; los nuevos CRUD, teclado/Atrás nativos y persistencia tras reiniciar Android todavía requieren validación en teléfono.

Manifest: Angular 22, Angular Native 0.7, Expo SDK 57, React Native 0.86, TypeScript 6 y Vitest 5. Versiones resueltas en package-lock.json. Vistas nativas mediante Fabric, no Ionic/WebView. Tailwind CSS 4 integrado con @ng-native/tailwind 0.7, Metro y src/styles.css; estilos globales nativos registrados en src/main.ts.

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

Identificadores/comentarios en inglés; textos de usuario inicialmente en español. Angular moderno y features completas incrementales. agents.md y roadmap.md locales ignorados por Git. AGENTS.md/CLAUDE.md del starter eliminados tras consolidar reglas nativas útiles en agents.md. README y traducción se versionan.

[Angular Native](https://ng-native.com/guide/getting-started) · [Nora API](https://github.com/matigaleanodev/nora-api)

## Dominio de clientes y presupuestos

Carpetas por dominio como en los otros Angular: `customers/models`, `customers/services`, `estimates/models`, `estimates/services` y `estimates/utils`; contratos de entidad/UUID y generación de UUID en `shared`. Los servicios exponen operaciones locales asíncronas; la UI se conecta mediante componentes nativos delgados y servicios de página basados en signals. Las tareas de ejemplo siguen independientes.

Clientes con nombre, teléfono argentino opcional (código de área sin 0, número sin 15, diez dígitos combinados, formato fijo +549 e indicador WhatsApp), múltiples direcciones con nombre, email y notas opcionales. Clientes, direcciones, ítems y presupuestos usan UUID; Expo Crypto genera UUID v4. Los clientes se archivan/restauran en lugar de eliminarse para preservar referencias. Nombre y nombre visible de dirección obligatorios; los demás campos de dirección pueden quedar incompletos.

Presupuestos con referencia al cliente y dirección opcional, número visible único ingresado por el usuario, descripción, ítems de materiales/mano de obra, ARS/USD, vigencia opcional (YYYY-MM-DD) y notas públicas. Unidades: m, m², m³, litros, unidades, horas y trabajo completo. Los borradores admiten lista vacía; enviar requiere al menos un ítem. Se pueden editar/eliminar borradores; luego pasan a enviado y aceptado/rechazado. Al guardar el borrador se copia el cliente/dirección; esa copia queda fija al enviarlo. Editar el cliente después no reescribe presupuestos. Sin conversión de moneda, impuestos, descuentos, PDF ni integración de envío; el estado sólo registra seguimiento local.

Precios en centavos enteros no negativos. Cantidades positivas, máximo 1.000.000, hasta tres decimales. Cada subtotal redondea mitades hacia arriba a centavos mediante aritmética entera; el total suma subtotales redondeados, con límites de enteros seguros. Los totales se calculan, no se guardan. Claves JSON SQLite versionadas `customers.v1` y `estimates.v1` sobre storage existente; operaciones de lectura/modificación/escritura serializadas dentro del proceso, recuperables tras errores. No es sincronización entre procesos ni backup remoto. Futuros esquemas requieren migración explícita.

Validación: typecheck y suite actual correctos (interacciones nativas y dominio/adaptador de persistencia). Falta verificar los nuevos CRUD/UUID nativos en Android.

## Feedback visual

`NotificationService` en `shared/services` expone `success(message, options?)`, `warning(...)`, `danger(...)` y `dismiss()`. El componente global `nora-toast` aparece sobre las tabs, fuera del contenido desplazable. Sólo se muestra el último aviso. Success desaparece a los cinco segundos; warning/danger permanecen hasta cerrarlos. Se puede configurar `{ durationMs: 8000 }`, o cero para cierre manual. Todas las variantes incluyen botón de cierre y anuncio accesible no interruptivo. Colores basados en los tokens existentes. Las tareas y los CRUD muestran feedback de éxito/error; los servicios de dominio siguen rechazando errores para que los servicios de página puedan manejarlos y mostrar avisos sin ocultar fallos. Sin notificaciones del sistema ni permisos. Typecheck y suite actual correctos; falta verificar renderizado de toasts en Android.

## Pruebas unitarias

Ejecutar `npm test` desde Ubuntu/WSL. La suite tiene 136 casos correctos en veintidós archivos, con interacciones de UI y pruebas unitarias para servicios de dominio/compartidos y flujos de página: storage local, generación de UUID, clientes, presupuestos, tareas y notificaciones. Descripciones de casos en español. Cubren errores de persistencia, actualizaciones serializadas, validaciones, estados, snapshots, cálculos y temporizadores de toasts. SQLite y Expo Crypto están simulados: esta suite no demuestra ejecución nativa de la base ni del generador aleatorio. `npm run typecheck` también correcto.

## Formato

Prettier usa sus valores estándar (`.prettierrc.json`), sin plugins. Ejecutar `npm run format` para formatear o `npm run format:check` para verificar. VS Code recomienda la extensión Prettier y activa formato al guardar; instalar la extensión en WSL al desarrollar ahí. Se excluyen generados, dependencias, builds nativos, cobertura, package-lock e instrucciones/planificación locales.

## Flujos CRUD móviles

Los componentes de página sólo enlazan signals y llaman servicios. `CustomersPageService` y `EstimatesPageService` administran lista/detalle/formulario, búsquedas, borradores, confirmaciones/Atrás nativos, cierre de teclado y notificaciones; los servicios de dominio validan y persisten. Los servicios de página viven durante la sesión de la app, por lo que cambiar de tab conserva formularios sin guardar. Volver pide confirmar antes de descartar cambios. No hay recuperación de formularios tras terminar el proceso.

Formularios con direcciones múltiples e ítems de materiales/mano de obra, cantidad, unidad y precio unitario. Guardar queda fuera del scroll; adaptación al teclado y Atrás Android mediante APIs nativas oficiales. Precios admiten coma o punto decimal, hasta dos decimales y sin separadores de miles. El pipe `money` muestra centavos como `$` (ARS) o `US$` (USD), con formato argentino. Cantidades de tres decimales; parciales y totales usan las mismas reglas del dominio. Cambiar moneda no convierte precios existentes.

Crear un cliente primero; después preparar el presupuesto, seleccionar cliente/dirección y agregar ítems. Los borradores admiten lista de ítems vacía. Estados de presupuesto sólo para seguimiento local; PDF y envío pendientes. Listas con scroll para el primer conjunto pequeño offline; se pueden virtualizar al crecer el volumen.

Validación con interacciones de componentes, tests de dominio, flujo CRUD completo con storage simulado, conservación de formularios entre tabs, fuente simulada de Atrás nativo, formato monetario y conversión decimal. Export Android correcto; no se instaló ni probó el nuevo CRUD en teléfono durante esta iteración.

`npm start` activa explícitamente Expo Go con túnel (`expo start --go --tunnel`), evitando depender del acceso directo a la dirección NAT de WSL desde el teléfono. Dejar el proceso corriendo y escanear el QR dentro de Expo Go. El túnel requiere internet y Expo CLI puede pedir instalar @expo/ngrok.

Las páginas componen componentes de presentación reutilizables para listas, detalles, formularios y editores. Los componentes compartidos resuelven botones, campos, estructura de página y acción flotante. Signal inputs y outputs separan la presentación de los servicios de página; sus contratos tienen pruebas unitarias.

Las direcciones se editan en un modal nativo reutilizable. Los cambios quedan en un borrador aislado hasta confirmar; cancelar o volver desde Android descarta ese borrador. Confirmar la dirección actualiza el formulario; guardar el cliente la persiste. Los toasts aparecen sobre las tabs inferiores.

Los íconos vectoriales nativos usan @ng-native/icons con Bootstrap Icons y react-native-svg compatible con Expo. Los íconos decorativos no reciben toques. WhatsApp es un checkbox accesible junto al número de teléfono, y el botón flotante usa un ícono vectorial de suma.

Los formularios incluyen ejemplos y marcan los campos obligatorios con *. El campo compartido configura autocompletado nativo de contacto y captura el fin de edición; los eventos sin texto no borran valores existentes. La vigencia usa el calendario de Android. Las fechas de calendario se guardan como yyyy-MM-dd y muestran dd/MM/yyyy mediante CalendarDatePipe, sin conversión UTC; los futuros documentos deben reutilizar este formato. Sigue pendiente reproducir el fallo de guardado del teléfono; desarrollo registra el stack original.

Flujo de desarrollo: crear ramas feat/, fix/, refactor/, test/, chore/ o docs/ desde main actualizado; usar commits semánticos en español type(scope): descripción y abrir PR hacia main. dev refleja main y no debe contener trabajo independiente. CI verifica formato, tipos, unitarios y exportación del bundle Android; no genera APK ni publica. sync-dev.yml crea dev si falta, intenta fast-forward y luego merge, y usa force-with-lease sólo ante conflictos, según el estándar del workspace. Usa GITHUB_TOKEN con contents:write; DEV_SYNC_PAT opcional permite disparar workflows desde el push del bot. Con GITHUB_TOKEN ese push a dev no dispara otro CI; los de PR/main sí se ejecutan. Las reglas de ramas deben permitir la sincronización del bot. Los workflows se activan al subirlos.

Estado GitHub verificado al 2026-10-09: dev remota creada desde main. main exige PR (cero aprobaciones obligatorias para el mantenimiento individual), resolución de conversaciones y aplica protección a administradores; bloquea push forzado y borrado. dev bloquea borrado y permite pushes directos/forzados para sincronizar el espejo, sin enforcement de administradores. Los checks obligatorios de CI se configurarán tras la primera ejecución de Actions.
