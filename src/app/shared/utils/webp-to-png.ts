/** Tope de píxeles de un logo: pdf-lib decodifica el PNG en JavaScript y Expo decodifica el WebP en memoria. */
export const MAX_LOGO_PIXELS = 16_000_000;

/**
 * Convierte un WebP a PNG con la conversión nativa de Expo, la misma que usa el PDF (pdf-lib sólo
 * incrusta PNG y JPEG). El PNG intermedio se elimina de la caché tanto si la lectura sale bien como si falla.
 */
export async function convertWebpToPng(uri: string): Promise<Uint8Array> {
  const { File, Paths } = await import("expo-file-system");
  const { ImageManipulator, SaveFormat } =
    await import("expo-image-manipulator");
  const context = ImageManipulator.manipulate(uri);
  try {
    const image = await context.renderAsync();
    try {
      const result = await image.saveAsync({ format: SaveFormat.PNG });
      const converted = new File(result.uri);
      try {
        const bytes = await converted.bytes();
        // El PNG intermedio también respeta el tope antes de llegar a pdf-lib.
        const header = new DataView(
          bytes.buffer,
          bytes.byteOffset,
          bytes.length,
        );
        if (
          bytes.length < 24 ||
          header.getUint32(16) * header.getUint32(20) > MAX_LOGO_PIXELS
        )
          throw new Error("El logo convertido es demasiado grande.");
        return bytes;
      } finally {
        try {
          if (converted.uri.startsWith(Paths.cache.uri) && converted.exists)
            converted.delete();
        } catch {
          /* Android puede recuperar estos temporales al necesitar espacio. */
        }
      }
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}
