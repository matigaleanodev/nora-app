# Nora — Diseño y experiencia de usuario

[English](ux-guidelines.md) · [Identidad visual](visual-identity.es.md)

Actualizado: 2026-10-16. Reglas de diseño objetivo para implementar en otro hilo. Incluye acuerdos expresos y detalles rutinarios resueltos por delegación del usuario; el alcance futuro se identifica por separado. Mantener ambas traducciones.

## Necesidades confirmadas

- La interfaz actual se siente tosca y difícil; cambiar la paleta no alcanza.
- Reemplazar «ítem» por «material» o «tarea» según el contexto; la sección se llama «Materiales y mano de obra».
- Un presupuesto puede tener muchos materiales y tareas de mano de obra. Evitar que cada agregado despliegue otro formulario dentro de la página y la haga crecer de manera incómoda.
- Reubicar y aclarar la navegación para volver.
- Hacer más visible el perfil del trabajador o negocio; el engranaje actual no comunica suficientemente su propósito.
- Mantener las secciones principales en tres pestañas inferiores; opciones secundarias en menú lateral derecho con hamburguesa arriba a la derecha, provisional hasta validar uso real.

## Observaciones de las capturas

- Logo, espacio superior, frase introductoria y título ocupan una porción considerable de la pantalla antes de comenzar la tarea.
- El botón circular para volver queda separado de la primera fila del encabezado.
- Los renglones del detalle usan tarjetas altas; con muchos materiales aumentará el desplazamiento necesario.
- Las capturas también muestran un control flotante «Tools» y una superposición de entorno. No se incorporan a la propuesta de navegación del producto; su origen debe verificarse en la implementación.

## Navegación definida

- Aceptada la base presentada: encabezado compacto con flecha para volver, lista compacta de materiales/mano de obra, editor dedicado y carga repetida. Los detalles rutinarios se concretan mediante la delegación registrada más abajo.
- Descartada la cuarta pestaña «Más». El usuario prefiere conservar las pestañas para las tareas principales y evaluar un menú lateral abierto mediante hamburguesa para opciones secundarias.
- Inicio muestra «Mi negocio»: resumen real y botón que abre el formulario de sus datos. Reemplaza las tareas ficticias de la pantalla inicial; la pestaña mantiene el nombre corto «Inicio».
- Decisión provisional acordada: hamburguesa arriba a la derecha en las pantallas principales y menú lateral modal que entra desde la derecha. Mantener tres pestañas inferiores para las tareas principales; revisar ergonomía con uso real.
- Criterio futuro acordado: si surge una cuarta sección principal, reevaluar la barra inferior y considerar integrar allí el activador del menú, conservando la apertura lateral desde la derecha. No es un cambio automático: comparar claridad, espacio y alcance antes de decidir.

### Estructura y comportamiento

- Tres destinos inferiores: Clientes · Inicio (pantalla «Mi negocio») · Presupuestos, conservando el orden actual. No repetir esos destinos dentro del menú lateral.
- La pantalla «Mi negocio» resume información real y ofrece «Editar datos de mi negocio» para nombre, contacto y logo. El usuario no necesita tener una empresa constituida; diferenciar el resumen del formulario «Datos de mi negocio».
- Resumen inicial: presupuestos en borrador y enviados pendientes de respuesta, con accesos al presupuesto correspondiente. Usar los estados locales sin afirmar entrega o lectura. Agenda y próximas visitas sólo cuando existan; no mostrar tareas ficticias, ingresos inferidos de presupuestos ni métricas decorativas.
- Según la decisión provisional acordada, menú lateral modal desde la derecha, abierto mediante hamburguesa arriba a la derecha de las tres pantallas principales. Reservarlo para ajustes y contenido secundario; cerrar antes de navegar a la opción elegida.
- Organización futura posible: Ajustes (incluye apariencia cuando esté disponible), Ayuda y Legales. Estas categorías no aprueban implementar funciones nuevas ni mostrar accesos vacíos.
- Un menú oculto reduce visibilidad y exige alcanzar el encabezado; aceptarlo para opciones ocasionales, manteniendo las tareas frecuentes en las pestañas y los datos del negocio en la pantalla principal.
- En pantallas secundarias, ocultar la hamburguesa y mostrar la flecha para volver a la izquierda del título. Atrás de Android o tocar el fondo cierra primero el menú abierto. Mantener foco accesible dentro del menú y devolverlo al botón al cerrar.
- Agregar otras opciones sólo cuando existan: no llenar el menú con funciones futuras o inactivas.
- Un solo encabezado compacto por pantalla: título y acciones relevantes. En pantallas secundarias, flecha para volver a la izquierda del título. Evitar repetir logo, lema y título en cada formulario.
- En creación, edición y detalle, ocultar las pestañas para dar espacio y mantener el contexto. Al volver, conservar la sección, búsqueda y posición anteriores.
- Atrás de Android debe respetar el contexto: cerrar teclado o selección antes de salir. Salir de un formulario modificado requiere resolver los cambios sin guardar; no perderlos silenciosamente.
- Si falta el perfil del negocio, ofrecer en Inicio un acceso contextual «Completá los datos de tu negocio», descartable y sin bloquear el uso de la app.

## Presupuestos

### Vocabulario

- Sección «Materiales y mano de obra».
- Acciones explícitas «Agregar material» y «Agregar mano de obra».
- Descripción de mano de obra mediante «Trabajo a realizar». Usar «material» o «tarea» al editar y eliminar; evitar «ítem» en la interfaz.
- «Renglón» puede usarse en documentación interna para el elemento común; no requiere renombrar modelos de código.

### Lista y editor

- El presupuesto muestra renglones compactos con descripción, cantidad/unidad, precio unitario y subtotal. No mostrar formularios completos por cada agregado.
- Agrupar materiales y mano de obra con encabezados y subtotales; mostrar también el total general. Los importes deben poder leerse y compararse con facilidad.
- Tocar un renglón abre su edición en una pantalla dedicada. Agregar abre el mismo editor adaptado al tipo elegido, sin expandir el formulario principal.
- El editor permite «Agregar», «Agregar y cargar otro» y cancelar. Al editar, usar «Guardar cambios».
- «Agregar y cargar otro» incorpora el renglón al borrador, limpia los campos y deja listo el siguiente del mismo tipo. Volver conserva los ya incorporados y resuelve por separado los cambios del editor actual.
- Al confirmar «Agregar» o «Guardar cambios» de un material o tarea, incorporar el cambio al borrador e iniciar su autoguardado local. Sólo informar que está guardado después de confirmar la escritura; cancelar conserva el renglón anterior.
- Cancelar la edición de un renglón no modifica su valor anterior. Eliminar debe ser una acción explícita, no depender de descubrir un gesto.
- Mantener «Agregar material» y «Agregar mano de obra» accesibles para carga repetida. El total y «Revisar presupuesto» tienen un lugar estable sin tapar los últimos renglones ni el teclado. Revisar sale del editor hacia la revisión, valida lo necesario y no envía ni cambia el estado. No exigir «Guardar borrador» manual como mecanismo normal de persistencia.
- Separar datos principales (cliente, descripción, moneda) de «Vigencia y condiciones», un desplegable secundario que conserva acceso y valores cargados; indicar en su resumen cuándo contiene datos. Número visible sigue editable y obligatorio al validar el documento; no introducir numeración automática en este corte.
- No introducir catálogo, carga masiva, asistente por pasos ni nuevas reglas de negocio sin acordar su necesidad.

## Autoguardado de presupuestos

### Criterio de trabajo acordado

El usuario delega los detalles de diseño y UX que mejoren la experiencia dentro del alcance de Nora. Documentar decisiones con su motivo, sin pedir aprobación por cada detalle rutinario. Consultar cuando cambien el alcance, las reglas de negocio o aparezcan alternativas con consecuencias relevantes. Esta autorización no incluye implementar código en este hilo.

### Decisión acordada

- Autoguardar localmente el borrador para reducir acciones manuales y permitir continuar después.
- Guardar no envía, comparte ni cambia por sí solo el estado del presupuesto. No implica sincronización ni backup remoto.
- Esta decisión se limita al borrador del presupuesto; no extiende automáticamente el autoguardado a clientes, perfil del negocio ni presupuestos ya enviados.

### Comportamiento definido

- Mostrar un indicador discreto «Guardando…» / «Guardado en este teléfono», sin un toast por cada cambio. Ante un fallo, mantener los datos editados y mostrar «No pudimos guardar los cambios» con una acción de reintentar. No afirmar que se guardó antes de confirmar la escritura.
- Volver después de un guardado confirmado conserva el borrador sin pedir confirmación por cambios ya guardados. Si hay escritura pendiente o fallida, resolverla o advertir antes de salir; no perder cambios silenciosamente.
- Permitir recuperar lo guardado al reabrir la app. No prometer recuperar pulsaciones todavía no persistidas si el sistema cierra el proceso.
- Separar conservar un borrador incompleto de validarlo para revisar o compartir. Crear su recuperación desde el primer cambio significativo, sin exigir cliente, descripción ni número definitivo; no crear registros al abrir y cerrar un formulario intacto. Las reglas de recuperación siguientes tratan entradas incompletas o inválidas.
- Confirmar un material o tarea aplica el cambio al presupuesto y lo autoguarda. Conservar los campos de un editor interrumpido como recuperación separada, sin incorporarlos automáticamente; volver a ese editor permite continuar o descartarlos. «Cancelar» elimina sólo esa recuperación y conserva el valor confirmado anterior.
- Borrar un borrador debe ser una acción explícita con confirmación; volver no equivale a eliminarlo.
- «Revisar presupuesto», «Compartir PDF» y «Marcar como enviado» son acciones explícitas e independientes. La revisión muestra el documento y pendientes concretos antes de compartir.

### Reglas de recuperación y validación definidas

- Conservar automáticamente el trabajo incompleto desde el primer cambio significativo del usuario; abrir y cerrar un formulario sin modificarlo no debe generar borradores vacíos.
- Permitir conservar un borrador sin cliente, descripción o número definitivo. Mostrar «Presupuesto sin completar» cuando no haya identificación suficiente, con fecha de última edición para reconocerlo. Esto requiere revisar los contratos actuales en la futura implementación, sin debilitar las reglas del presupuesto listo para compartir.
- Preservar entradas transitorias, como un precio todavía incompleto, para recuperar la edición. No tratarlas como importes válidos ni calcular totales engañosos: indicar qué material o tarea falta completar.
- Al reabrir un borrador, recuperar lo persistido y mostrar discretamente que está incompleto, sin una sucesión de errores por campos que todavía no se terminaron de cargar.
- Mostrar errores de un campo al terminar de editarlo cuando corresponda. Al elegir revisar para compartir, comprobar todos los requisitos del documento y guiar al primer problema, conservando el resto de lo escrito.
- La revisión debe mostrar qué falta y cómo resolverlo; no dejar una acción deshabilitada sin explicación. Validar el borrador actual antes de generar el PDF, sin cambiar estado ni compartir automáticamente.
- Distinguir los renglones confirmados de lo escrito en su editor: recuperar un editor interrumpido no incorpora automáticamente ese contenido al presupuesto. Cancelar descarta sólo esa edición y conserva los cambios confirmados anteriormente.
- Validar en la implementación que estas reglas sobrevivan a cierre y reapertura; el indicador de guardado debe reflejar persistencia real, no sólo estado en memoria.

## Movimiento y transiciones

### Criterio de diseño

Usar movimiento breve, sobrio y funcional para explicar cambios de contexto o estado. La respuesta al toque debe ser inmediata; una animación no agrega esperas artificiales ni condiciona la persistencia de datos. Mantener coherencia con la identidad profesional y cercana de Nora.

| Interacción                          | Comportamiento                                                                                                  |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Abrir/cerrar menú                    | Panel que entra y sale desde la derecha; fondo atenuado coordinado.                                             |
| Abrir detalle/editor y volver        | Transiciones consistentes de avance y retorno, preferentemente con el comportamiento nativo.                    |
| Cambiar de pestaña                   | Cambio directo o transición de opacidad breve; evitar simular avance/retroceso entre secciones del mismo nivel. |
| Desplegar opciones                   | Expansión/contracción corta que conserve el contexto, con indicador de abierto/cerrado.                         |
| Tocar un botón                       | Estado presionado inmediato, sin mover el contenido ni alterar el área táctil.                                  |
| Agregar/eliminar un material o tarea | Transición local y breve del renglón afectado, conservando la posición de lectura; no animar toda la lista.     |
| Autoguardado y totales               | Cambio discreto del indicador; sin celebraciones, toasts repetidos ni cifras que ruedan.                        |

### Ritmo inicial para validar en teléfono

- Feedback breve: aproximadamente 100–150 ms; la respuesta visual empieza al tocar.
- Cambios locales y desplegables: aproximadamente 160–220 ms.
- Menú y cambios de contexto: aproximadamente 220–300 ms, salvo transiciones nativas o interactivas que definan su propio ritmo.
- Son referencias de diseño de Nora, no duraciones universales ni requisitos rígidos. Ajustar por distancia, tamaño del contenido, teclado y rendimiento real. Preferir una desaceleración suave, sin rebotes ni sobrepasos llamativos.

### Accesibilidad y comportamiento

- Respetar la preferencia del sistema para reducir o quitar animaciones: eliminar desplazamientos amplios y expansiones animadas; usar cambio inmediato o una opacidad discreta si corresponde. Mantener el mismo contenido y funcionalidad.
- Las transiciones no deben robar foco, ocultar errores ni constituir el único indicador de un cambio. Los desplegables exponen también su estado accesible.
- Resolver toques repetidos y cambios de dirección sin acumular animaciones, duplicar operaciones o bloquear la pantalla por motivos visuales.
- Evitar entradas escalonadas de tarjetas, movimiento decorativo continuo, parallax, efectos de rebote y animaciones de apertura en cada regreso a una lista.
- Probar con presupuestos largos, teclado abierto, texto ampliado y movimiento reducido. Simplificar un efecto si introduce tirones o dificulta la carga repetida.

## Validación pendiente

### Referencias locales y ergonomía — evaluación del 2026-10-16

- Revisados en lectura los componentes de navegación de `modo-playa-app` y `foodly-notes-front`. Ambos combinan tres destinos inferiores y menú lateral desde la derecha, con activador superior. Modo Playa agrupa opciones por secciones e incluye selección de tema; Foodly incluye tema e idioma y repite destinos principales en el menú. Para Nora se propone conservar la separación entre tareas y opciones secundarias, sin esa duplicación.
- El usuario señala la incomodidad de alcanzar la parte superior y pide criterio independiente: sus ideas son aportes, no decisiones automáticamente aprobadas.
- Recomendación de evaluación: conservar el activador de menú arriba para opciones ocasionales, y priorizar abajo navegación diaria, agregar y guardar. «Mi negocio» accesible desde Inicio evita depender del menú para editar datos. Se acordaron provisionalmente el activador arriba a la derecha y el panel desde la derecha.
- Un activador inferior es posible, pero sumarlo a tres destinos compite por espacio y puede parecer una cuarta pestaña; no es automáticamente más simple. No añadir otra barra ni botón flotante de menú sin demostrar necesidad.
- Si las pruebas muestran uso frecuente, dificultad real con el menú superior o surge una cuarta sección principal, comparar un activador inferior diferenciado. El panel seguirá abriendo desde la derecha según el criterio acordado; no implementar el cambio por anticipado.
- Validar en teléfono con una mano, tanto izquierda como derecha y texto ampliado. No asumir una zona del pulgar universal; separar frecuencia de uso, alcance y descubrimiento.

- Aplicar la navegación, vocabulario y editor definidos; validar su comprensión y ajustar con evidencia de uso.
- Probar carga y corrección de presupuestos con 1, 20 y 50 renglones, incluyendo descripciones largas, distintas unidades y teclado abierto. Son escenarios de prueba, no límites del producto.
- Revisar lectura con texto ampliado, acciones táctiles y anuncios accesibles.
- Comprobar volver, cancelar, editar y guardar sin pérdida de datos ni saltos de posición inesperados.
- Validar con el primer trabajador real que «Mi negocio» y las acciones de materiales/mano de obra se entienden sin explicación.

## Registro

- 2026-10-16: consolidadas las reglas por delegación de UX: Inicio/Mi negocio, recuperación separada de editores, revisión explícita y despliegue secundario de vigencia/condiciones. Futuros cambios de alcance se mantienen pendientes en el traspaso.

- 2026-10-16: definidas transiciones suaves y funcionales para navegación, menú, desplegables y feedback; ritmo inicial sujeto a validación nativa y respeto de movimiento reducido.

- 2026-10-16: acordado autoguardado local del borrador, separado de enviar/compartir; indicadores, recuperación y datos incompletos definidos en esta guía.

- 2026-10-16: acordados provisionalmente menú arriba a la derecha y panel lateral desde ese lado, manteniendo tres pestañas principales. Sustituye la propuesta inicial de panel desde la izquierda; sujeto a validación de uso.

- 2026-10-16: recibidas capturas y feedback sobre vocabulario, carga extensa, volver y acceso al perfil; sus soluciones se consolidan en las reglas vigentes.
- 2026-10-16: aceptada la base salvo «Más» como cuarta pestaña; elegidos menú lateral para secundarios e Inicio/Mi negocio con resumen y acceso al formulario.
