# Nora — Variantes vectoriales y splash exploratorio

[English](README.md)

2026-10-16. Prototipos derivados del contorno del símbolo elegido `03-monogram-v2.png`; no reemplazan assets ni configuran el arranque de la app.

- `nora-primary.svg`: figura blanca sobre petróleo `#17645B`.
- `nora-inverted.svg`: misma figura en petróleo sobre blanco.
- `nora-symbol.svg`: símbolo sin fondo, con `currentColor` para aplicaciones controladas.
- `nora-color-variants.svg` y su PNG: comparación de ambas aplicaciones.
- `nora-splash-animated.svg`: exploración de fondo blanco, símbolo verde y firma «Nora». Aparición por opacidad del símbolo en 240 ms y del nombre en 180 ms, con inicio a los 80 ms. El micrófono sube apenas y vuelve a su posición en 620 ms, comenzando a los 80 ms; una sola reproducción, sin bucle ni espera artificial.
- `nora-splash-fade-source.svg`: fuente previa conservada, con la misma silueta y únicamente la aparición por opacidad.
- `nora-splash-preview.png`: estado final del prototipo con Noto Sans.

El trazado vectorial inicial elimina la textura del raster y usa colores planos exactos. Revisar y suavizar los contornos definitivos antes de producción; no se insertó un PNG dentro del SVG. La firma del SVG pide Noto Sans y tiene fuente alternativa: para distribución final, empaquetar la fuente o convertir el nombre a contornos. La captura se generó con Noto Sans cargada.

El micrófono está separado en su propio grupo vectorial. Su recorrido máximo es de 2,5 unidades del contorno, aproximadamente 0,7 px en la composición de 480 px de ancho (0,47 px en la captura de 320 px). Usa una curva suave `cubic-bezier(.4,0,.2,1)`, sin rebote, y vuelve exactamente a la posición inicial a los 700 ms desde el inicio de la composición. No hay imágenes incrustadas ni dependencias nuevas.

El prototipo responde a `prefers-reduced-motion`: sin animación, con contenido visible. Verificado con Edge headless: opacidad inicial 0, opacidad final 1; desplazamiento máximo del micrófono a los 359 ms y retorno a cero a los 700 ms; una iteración por animación. Con movimiento reducido, cero animaciones y micrófono estático. La comparación rasterizada del estado final con la fuente previa difiere sólo en siete píxeles de suavizado en la unión de los trazos; la silueta se conserva. Esto no prueba comportamiento nativo.

## Criterios de marca recomendados

- Escribir **Nora** con mayúscula inicial en textos, títulos y firma tipográfica. El símbolo conserva la **n minúscula** elegida: es un dibujo de marca y no requiere otra fuente.
- Usar la versión blanca sobre petróleo como principal para el launcher y la versión petróleo sobre blanco en fondos claros. No alternarlas arbitrariamente en el mismo contexto ni deformar la silueta.
- La variante invertida y el splash son propuestas de aplicación; no constituyen selección final del splash ni rediseño del símbolo.

## Alcance técnico

El SVG animado es una referencia de diseño para navegador. El splash inicial nativo de Android no ejecuta directamente animación CSS/SMIL de un SVG: Android documenta AnimatedVectorDrawable XML para su ícono animado. Expo contempla animaciones personalizadas, pero la integración con Angular Native y la versión del proyecto debe verificarse en el hilo de implementación.

Conservar continuidad entre splash nativo y contenido de la app: mismo fondo, tamaño y posición del símbolo, sin un segundo splash que vuelva a ocultar y revelar el logo. Si la app está lista, continuar sin esperar que termine una animación. Respetar también la preferencia nativa de quitar animaciones y validar el resultado en una build instalada; Expo Go no reproduce fielmente el splash final.

Fuentes: [Android Splash screens](https://developer.android.com/develop/ui/views/launch/splash-screen) y [Expo SplashScreen](https://docs.expo.dev/versions/latest/sdk/splash-screen/). Son referencias generales; no autorizan modificar el código ni adoptar dependencias en este hilo.
