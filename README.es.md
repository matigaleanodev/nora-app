# Nora App

[English](README.md)

![Angular 22](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white) ![Angular Native 0.22](https://img.shields.io/badge/Angular_Native-0.22-17645B) ![Expo SDK 57](https://img.shields.io/badge/Expo-SDK_57-000020?logo=expo&logoColor=white) ![React Native 0.86](https://img.shields.io/badge/React_Native-0.86-61DAFB?logo=react&logoColor=black) ![TypeScript 6](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white) ![Vitest](https://img.shields.io/badge/tests-Vitest-6E9F18?logo=vitest&logoColor=white)

**N.O.R.A. — Notas, Organización, Registros y Administración.** App Android offline para técnicos independientes: clientes, presupuestos con materiales y mano de obra, PDF para compartir, agenda de visitas con avisos locales y copia de seguridad manual. Funciona sin cuenta, backend ni anuncios.

## Qué hace

- **Clientes:** nombre, teléfono argentino opcional, varias direcciones con nombre, email y notas. Se archivan en lugar de eliminarse y ofrecen acciones de llamar, WhatsApp, email y mapa.
- **Presupuestos:** referencian un cliente y una dirección, con ítems de materiales y mano de obra, ARS o USD, vigencia opcional y notas públicas. Los borradores se editan y se autoguardan; un presupuesto enviado conserva la copia de los datos del cliente.
- **PDF:** documento A4 generado offline y compartido mediante la hoja de Android.
- **Agenda:** visitas y seguimientos, con cliente opcional y aviso local. Inicio muestra las visitas vencidas, de hoy y próximas.
- **Mi negocio:** nombre del proveedor, contacto y logo que se usan en cada PDF.
- **Copia de seguridad:** un único archivo JSON con todos los datos, que se guarda o restaura desde el menú lateral.

Las pestañas inferiores son Clientes, Inicio y Presupuestos; las demás opciones están en el menú lateral derecho.

## Stack y arquitectura

Angular 22 con componentes standalone y signals, renderizado como vistas nativas por Angular Native 0.22.2 mediante Fabric sobre Expo SDK 57 y React Native 0.86 (New Architecture). No usa Ionic, WebView ni DOM. Tailwind CSS 4 se integra con `@ng-native/tailwind` 0.22.2: `metro.config.js` compila `src/styles.css` y `src/main.ts` registra los estilos generados como estilos globales nativos. Native CSS es un subconjunto, por lo que no se usa el preflight del navegador. Las versiones resueltas están en `package-lock.json`; todos los paquetes `@ng-native/*` se actualizan juntos.

Los componentes solo presentan estado; los servicios de página coordinan los flujos con signals; los servicios de dominio validan y persisten. Los datos viven en `expo-sqlite` como claves JSON versionadas, con operaciones de lectura-modificación-escritura serializadas dentro de la app. Los ID son UUID v4 (`expo-crypto`). Los PDF usan `pdf-lib` y `@pdf-lib/fontkit` con Noto Sans incluida offline. Los avisos usan `expo-notifications`; no hay servidor push.

## Datos locales

| Clave                  | Contenido                                                       |
| ---------------------- | --------------------------------------------------------------- |
| `customers.v1`         | Clientes y sus direcciones                                      |
| `estimates.v1`         | Presupuestos con ítems y copia de datos del cliente             |
| `business-profile.v1`  | Perfil del proveedor y referencia al logo                       |
| `estimate-recovery.v1` | Formularios de presupuesto incompletos y editores interrumpidos |
| `visits.v1`            | Visitas y seguimientos de la agenda                             |

Un cambio de esquema exige una migración explícita. Los formularios sin guardar sobreviven al cambio de pestaña durante la sesión, y volver atrás pide confirmación antes de descartar cambios.

## Contratos y límites

**Presupuestos.** Los precios son centavos enteros no negativos. Las cantidades son positivas, hasta 1.000.000 y con hasta tres decimales; los subtotales redondean half-up y los totales suman los subtotales redondeados. No hay conversión de moneda, impuestos ni descuentos. El estado del presupuesto es solo seguimiento local.

**PDF.** Los datos del proveedor se leen al exportar. Una copia con nombre único queda en `cache/estimate-pdfs` y las copias de más de 24 horas se eliminan en exportaciones posteriores. Compartir no elige destinatario, no confirma la entrega ni cambia el estado del presupuesto.

**Logo.** JPG, PNG o WebP de hasta 5 MB, copiado al directorio privado `business-logos`; el original de la galería nunca se modifica.

**Acciones de contacto.** `tel:`, `https://wa.me`, `mailto:` y un enlace de búsqueda en Google Maps.

**Agenda y avisos.** Solo se programan las visitas pendientes con un aviso futuro. Los avisos se programan a las 08:00 si la visita no tiene hora y 30 minutos antes si la tiene; Android puede demorar la entrega. El identificador nativo de la notificación es el UUID de la visita, por lo que reprogramar reemplaza el aviso anterior; las operaciones sobre avisos se ejecutan una por una y se concilian al iniciar, al abrir la agenda y tras restaurar una copia. El permiso de notificaciones se pide al programar el primer aviso; sin él, las visitas se guardan sin aviso. Tocar un aviso abre la visita, esperando cualquier guardado en curso y respetando las ediciones sin guardar. La sincronización con el calendario del dispositivo y los avisos de vigencia de presupuestos no están implementados. Expo Go SDK 57 admite estos avisos locales; solo el push remoto no está disponible allí.

**Copia de seguridad.** `copia-nora-YYYY-MM-DD.json`, formato versión 1, con las cinco claves anteriores y un logo opcional en base64. El límite de 40 MiB por archivo rige al exportar y al importar: una exportación mayor se descarta y no se comparte. No se reemplaza nada hasta que todo el archivo valida: formato y fecha, ID y números de presupuesto únicos, reglas de dominio de cada registro y el logo, que exige un perfil de negocio, hasta 5 MiB decodificado y hasta 16 megapíxeles, y debe poder prepararse para el PDF (PNG y JPEG se decodifican con `pdf-lib`; el WebP debe convertirse con la misma conversión nativa que usa el PDF y su PNG convertido respeta el mismo tope). Restaurar pide confirmación, reemplaza todos los datos locales y reconstruye los avisos. La ruta local del logo y la marca de aviso de cada visita no se exportan. No existe copia automática ni en la nube.

## Desarrollo local

```bash
npm ci
npm run typecheck
npm test
npm run format:check
npx expo export --platform android
npm start
```

Node 24 según `.nvmrc`. `npm start` abre Expo Go mediante un túnel (`expo start --go --tunnel`); `npm run android` inicia Metro y solicita un dispositivo o emulador, por lo que ADB debe ser accesible y el teléfono debe llegar a Metro. Expo Go requiere un SDK compatible y los módulos nativos incluidos; de lo contrario, usá un development build. Estos comandos no generan un APK release firmado.

Punto de entrada: `src/main.ts`; componente raíz: `src/app/app.ts`; metadatos: `app.json`. Las pruebas corren sobre un host nativo simulado y simulan SQLite, Crypto, Sharing, FileSystem y Notifications, por lo que no prueban el comportamiento en un dispositivo. CI ejecuta formato, tipos, pruebas y la exportación de Android.

## Documentación

- [Identidad visual](docs/visual-identity.es.md)
- [Diseño y UX](docs/ux-guidelines.es.md)
- [Kit visual](docs/design-kit/README.es.md)
- [Instrucciones para colaboradores y agentes](AGENTS.md)
