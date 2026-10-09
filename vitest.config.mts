import { ngNative } from "@ng-native/testing/vitest";
import { defineConfig } from "vitest/config";

// Compila Angular como Metro, pero ejecuta los tests en Node con una plataforma nativa simulada.
// Estas pruebas no requieren emulador ni demuestran ejecución en un dispositivo real.
export default defineConfig({
  plugins: [ngNative()],
});
