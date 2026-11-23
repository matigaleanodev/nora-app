# nora-app

## Contexto de trabajo

Si existe un workspace con AGENTS.md en los directorios padre, leerlo explícitamente antes de editar y seguir sus referencias. Una raíz Git anidada puede impedir la herencia automática. Fuera de ese entorno, este archivo y el README deben ser suficientes para trabajar.

## Aplicación y dominio

- Angular Native + Expo, Android; elementos nativos de @ng-native/components y estilos Tailwind nativos.
- No usar Ionic, WebView, DOM, document/window ni componentes de platform-browser.
- Importar elementos nativos y utilizar eventos press/changeText, texto dentro de text y layout flex.
- Mantener accessibilityRole, accessibilityLabel y accessibilityState.
- Clientes/presupuestos/perfil se guardan offline en SQLite mediante servicios existentes.
- Precios en centavos enteros; cantidades y redondeos siguen los contratos del dominio.
- Preservar snapshots de cliente, UUID, recuperación de formularios y escrituras serializadas.
- Componentes presentan estado; servicios de página coordinan flujos y servicios de dominio validan/persisten.
- PDF offline usa el generador existente; compartir no confirma entrega ni cambia estado automáticamente.

## Desarrollo y verificación

- npm ci instala; npm start abre Expo; npm run android requiere dispositivo/emulador.
- npm run typecheck y npm test verifican tipos e interacciones con host nativo simulado.
- npm run format:check comprueba estilo.
- Los tests con @ng-native/testing no prueban ejecución en teléfono, teclado o compartir.
- Al cambiar @ng-native, revisar documentación oficial vigente y actualizar sus paquetes conjuntamente.

## Restricciones

- La app funciona sin cuenta, backend ni anuncios; no introducir dependencia de nora-api en uso offline.
- Preservar datos y claves versionadas; migrar almacenamiento explícitamente si cambia su esquema.
- Native CSS es un subconjunto: revisar advertencias y evitar preflight del navegador.
- Conservar fuentes, logos y recursos offline para PDF.
- Las integraciones de calendario, biometría o sincronización requieren definir su alcance específico.
