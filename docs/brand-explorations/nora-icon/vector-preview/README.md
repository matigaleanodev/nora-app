# Nora — Vector variants and splash exploration

[Español](README.es.md)

2026-10-16. Prototypes derived from the selected `03-monogram-v2.png` symbol outline; they do not replace assets or configure app startup.

- `nora-primary.svg`: white symbol on teal `#17645B`.
- `nora-inverted.svg`: identical silhouette in teal on white.
- `nora-symbol.svg`: background-free symbol using `currentColor` for controlled applications.
- `nora-color-variants.svg` and its PNG: comparison of both applications.
- `nora-splash-animated.svg`: white background, green symbol, and “Nora” wordmark exploration. Symbol opacity appears over 240 ms; the name over 180 ms starting at 80 ms. The microphone rises slightly and returns over 620 ms, starting at 80 ms. One playback, no loop or artificial wait.
- `nora-splash-fade-source.svg`: preserved previous source with the same silhouette and only the opacity reveal.
- `nora-splash-preview.png`: the prototype's final state with Noto Sans.

The initial vector trace removes raster texture and uses exact flat colors. Review and smooth final contours before production; no PNG is embedded in the SVG. The SVG wordmark requests Noto Sans with a fallback: bundle the font or outline the wordmark for final distribution. The screenshot was rendered with Noto Sans loaded.

The microphone is separated into its own vector group. Its maximum travel is 2.5 contour units, approximately 0.7 px in the 480 px composition (0.47 px in the 320 px screenshot). It uses a smooth `cubic-bezier(.4,0,.2,1)` curve without bouncing and returns exactly to its original position 700 ms after the composition starts. There are no embedded images or new dependencies.

The prototype respects `prefers-reduced-motion`: no animation and visible content. Edge headless checks confirmed initial opacity 0, final opacity 1, maximum microphone displacement at 359 ms, return to zero at 700 ms, and one iteration per animation. Reduced motion produces zero animations and a static microphone. Comparing the final raster with the previous source differs only in seven antialiased pixels at the path join; the silhouette is preserved. This does not prove native behavior.

## Recommended brand conventions

- Write **Nora** with an initial capital in copy, headings, and the wordmark. The selected symbol retains its **lowercase n**: it is custom artwork and does not require another typeface.
- Use white on teal as the primary launcher application and teal on white for light surfaces. Do not alternate arbitrarily within the same context or distort the silhouette.
- The inverted variant and splash remain application proposals, not final splash selection or a symbol redesign.

## Technical scope

The animated SVG is a browser design reference. Android's initial native splash does not directly execute SVG CSS/SMIL animation: Android documents AnimatedVectorDrawable XML for its animated icon. Expo supports custom animation approaches, but integration with Angular Native and the project's version must be verified in the implementation chat.

Preserve continuity between native splash and app content: identical background, symbol size, and position, without a second splash hiding and revealing the logo again. If the app is ready, proceed without waiting for animation to finish. Respect native remove-animation preferences and validate an installed build; Expo Go does not faithfully reproduce the final splash.

Sources: [Android Splash screens](https://developer.android.com/develop/ui/views/launch/splash-screen) and [Expo SplashScreen](https://docs.expo.dev/versions/latest/sdk/splash-screen/). These are general references and do not authorize code changes or new dependencies in this chat.
