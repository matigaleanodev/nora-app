// Carga el runtime de Expo antes de montar Angular, también en builds de producción.
// Incluye fetch con respuesta en streaming, URL, TextDecoderStream y structuredClone.
import "expo";
import { AppRegistry, Image, Platform, processColor } from "react-native";
import { mount } from "@ng-native/platform";
import {
  currentConditions,
  deviceTokens,
  watchConditions,
} from "@ng-native/device";
import {
  getFabricUIManager,
  registerPlatformComponents,
} from "@ng-native/fabric";
import { App } from "./app/app.ts";
import tailwind from "../.angular-native/app.tailwind.js";

registerPlatformComponents(Platform.OS);

AppRegistry.registerRunnable(
  "main",
  ({ rootTag }: { rootTag: number | string }) => {
    const app = mount(Number(rootTag), App, getFabricUIManager(), {
      globalStyles: tailwind,
      // Convierte colores al formato entero esperado por la plataforma.
      processColor,
      // Provee las condiciones del dispositivo para resolver consultas @media.
      conditions: currentConditions(),
      // Provee valores nativos como el grosor mínimo de línea según la densidad de pantalla.
      tokens: deviceTokens(),
      // Resuelve imágenes empaquetadas para que la plataforma nativa pueda cargarlas.
      resolveAssetSource: (value) => Image.resolveAssetSource(value as never),
    });

    // Actualiza las condiciones de estilos al rotar el dispositivo o cambiar el tema del sistema.
    // La app sigue usando tema claro; el motor mantiene disponible esta información.
    watchConditions(app.engine);
  },
);
