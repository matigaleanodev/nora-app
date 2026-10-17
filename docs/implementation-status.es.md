# Nora — Implementación de identidad y prueba manual

[English](implementation-status.md) · [Traspaso](implementation-handoff.es.md)

2026-10-17 · Revisión visual aceptada por el usuario y publicación autorizada. Las comprobaciones nativas pendientes se detallan abajo.

## Implementado

- P1 petróleo, T2 Noto Sans offline en cuatro pesos estáticos y F1: margen 16 dp, radios 8 dp y áreas táctiles mínimas de 48 dp. Se conserva Bootstrap Icons para mantener una sola biblioteca nativa.
- Monograma aprobado rasterizado sin redibujar para launcher, máscara adaptativa, versión monocroma y splash blanco. `scripts/prepare-fonts.py` obtiene los pesos desde la fuente variable licenciada del kit (`uv run --with fonttools python scripts/prepare-fonts.py`).
- Un encabezado compacto, menú modal desde la derecha, ayuda real y acerca de Nora; tres pestañas sólo en pantallas principales. Búsqueda y desplazamiento se conservan al volver dentro de cada sección.
- Inicio muestra perfil y presupuestos reales, incluidos borradores incompletos. Sin tareas ficticias ni importes interpretados como ingresos.
- Materiales/mano de obra agrupados con subtotales; editor dedicado, cancelación aislada y carga repetida. Vigencia/condiciones abre una pantalla dedicada desde una fila con resumen, antes de los materiales. Volver espera el autoguardado y conserva los datos. Revisar valida y conserva un documento; compartir y marcar enviado son independientes.
- Recuperación en `estimate-recovery.v1`: textos incompletos, editor no confirmado, UUID estable y escrituras serializadas. No cambia `estimates.v1`, `customers.v1` ni `business-profile.v1`. Una edición ilegible se conserva y bloquea su sobrescritura; un error de escritura mantiene el formulario y exige reintentar antes de volver.
- PDF A4 generado con `pdf-lib`/`@pdf-lib/fontkit`, subconjuntos de Noto Sans regular/negrita, paginación y totales del dominio. Ya no depende de Expo Print/WebView. La app verifica cabecera y tamaño del archivo antes de abrir `expo-sharing`; los logos WebP se convierten localmente a PNG. Caché privada de hasta 24 horas, sin cambiar el estado del presupuesto.

## Corrección de la primera iteración (2026-10-17)

- Corregidos exceso de contenedores y acciones con borde: menú y contadores usan filas de navegación, el cierre del menú usa un ícono accesible, y las filas de presupuesto alinean importe con descripción y dejan cantidad/precio debajo. Logo en miniatura y acciones livianas.
- Se eliminó el total duplicado del formulario y el bloque de total desproporcionado del detalle. Compartir PDF permanece en el pie del detalle.
- Se mantiene pdf-lib: el problema era la composición vertical y el ancho útil de las columnas. Cabecera y datos en columnas, logo acotado y tabla con alturas medidas. Casos de 2, 6 y 12 renglones breves, con logo y notas, pasan en una página. Cincuenta descripciones extensas y notas largas paginan; no se fuerza una página ilegible.
- Tipos y 186 tests en 28 archivos correctos; export Android correcto. Muestras del motor real revisadas con Poppler y texto extraído. Pendiente repetir la validación visual, teclado y compartir en el teléfono del usuario.

## Respuesta del calendario y fidelidad del PDF (2026-10-17)

- El calendario nativo se importa al iniciar el módulo; abrirlo ya no espera una importación dinámica. Se descartan pulsaciones concurrentes, sin encolarlas, y el campo bloquea fecha/borrado hasta cerrar. Selección, cancelación y error liberan el bloqueo. Se usan los callbacks vigentes `onValueChange`/`onDismiss`.
- PDF con negritas reales, metadatos alineados a la derecha, separadores petróleo, bloque de trabajo verde suave redondeado y subtotales destacados, respetando la referencia aprobada. Continúan pasando 2/6/12 renglones breves en una página.
- La medición de texto se memoriza por fuente y se hace por palabras; sólo una palabra demasiado ancha se divide mediante búsqueda binaria. `prepare-fonts.py` alinea los contornos a cuatro bytes: evita truncar offsets impares cuando fontkit genera `loca` corto. Se conserva la cobertura Unicode de las fuentes y se incrustan sólo los glifos usados. Un test verifica los contornos incrustados, además del render visual.
- El motor se carga antes de compartir y las dos fuentes se leen en paralelo, una vez por servicio. Se reutiliza el último PDF verificado mientras presupuesto/perfil no cambien y el archivo exista, conserve su tamaño y no haya vencido. Un fallo de compartir permite reintentar sin regenerar; cambios de importe/perfil o archivos ausentes/incompletos/vencidos regeneran.
- Medición orientativa del motor en Node/WSL, cuatro ejecuciones por caso: 2 renglones, aproximadamente 100 → 60 ms; 50 renglones largos, 1,1 s → 0,16 s. Muestra breve sin logo: aproximadamente 315 → 11 KB, incluyendo ahora dos pesos. No incluye carga del módulo, archivos ni selector de Android; no equivale a tiempos medidos en el teléfono.
- Tipos, 195 tests en 29 archivos y export Android correctos. Pendiente medir primera apertura y aperturas sucesivas del calendario, tocar repetidamente, cancelar/reabrir y compartir por primera y segunda vez en el dispositivo.

## Evidencia y límites

El fallo comunicado era «No pudimos generar el PDF»: la implementación anterior recibía un archivo ausente o vacío. El Expo Print 57.0.2 instalado inicia escritura sin esperar el callback de maquetación de Android; es una causa posible, no una reproducción confirmada en teléfono. El nuevo motor elimina ese paso nativo. Inicialmente se incrustó toda la fuente para evitar letras faltantes. La revisión de rendimiento resolvió el origen del problema en la alineación de los contornos y habilitó los subconjuntos, con pruebas sobre los contornos incrustados.

Verificación automatizada de la revisión: tipos correctos, 195 tests en 29 archivos, formato de los archivos modificados y bundle Android correctos (cuatro fuentes offline, bundle Hermes de 5,9 MB). Se renderizaron PDFs del motor real, de una página y de 50 renglones con notas extensas, además de leer sus metadatos A4. Esto no valida ejecución en Android.

El splash de producción usa la imagen estática aprobada y se oculta cuando la app está lista, sin una segunda pantalla ni espera artificial. El movimiento exploratorio del micrófono no se trasladó a una animación CSS nativa: Android no ejecuta ese SVG. Revisar la integración en una build instalada; Expo Go no reproduce el launcher ni el splash final. Las transiciones de la app respetan movimiento reducido. Quedan pendientes foco TalkBack, ergonomía, texto ampliado y comportamiento del teclado en teléfono.

## Prueba manual antes de publicar

1. Arrancar con `npm start -- --clear`. Comprobar Inicio vacío y con datos reales; abrir/cerrar menú con el fondo y Atrás, Ayuda, Acerca y datos del negocio. Revisar que no haya encabezados duplicados ni pestañas en edición/detalle.
2. Crear/editar cliente con direcciones, guardar y volver. Confirmar búsqueda y posición al regresar. Probar selección de logo y persistencia del perfil/logo tras reinicio.
3. Abrir y cerrar un presupuesto intacto: no debe aparecer una recuperación vacía. Empezar sin cliente ni número, escribir una descripción y esperar «Guardado en este teléfono». Cerrar/reabrir la app y continuar el mismo borrador desde Presupuestos.
4. Agregar material y mano de obra con «Agregar y cargar otro». Interrumpir un precio como `12,`, volver y continuar el editor pendiente. Confirmar no debe incorporar una entrada inválida; cancelar conserva el material/tarea anterior. Probar eliminación explícita.
5. Revisar con datos faltantes y completarlos. Verificar ARS/USD, centavos, cantidades decimales, vigencia y condiciones. Volver después de autoguardar conserva los cambios; una recuperación pendiente no se comparte como si fuera el documento anterior.
6. Compartir PDF sin logo y con PNG/JPEG/WebP. Abrir el archivo en otra app, enviarlo a un contacto de prueba y cancelar/reintentar el selector. Compartir no debe marcar enviado. Probar 1, 20 y 50 renglones, nombres/importes largos y notas extensas.
7. Probar texto del sistema ampliado, TalkBack, movimiento reducido, teclado y uso con una mano. Confirmar que todas las acciones sigan accesibles y los últimos renglones no queden tapados.
8. En una build Android instalada, comprobar nombre Nora, icono normal/adaptativo/monocromo y splash. Su validación es distinta de Expo Go. Publicar la rama sólo después de la conformidad manual del usuario.
