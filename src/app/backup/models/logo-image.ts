/**
 * Validación de los bytes de un logo importado. La comprobación estructural (síncrona) verifica la forma
 * del formato declarado; `isUsableLogo` además lo decodifica, de modo que un Base64 válido pero ajeno (por
 * ejemplo `AAAA` como PNG) o una imagen sin datos no llegue a reemplazar el logo ni al PDF.
 */
import { PDFDocument } from "pdf-lib";
import { MAX_LOGO_PIXELS } from "../../shared/utils/webp-to-png";
import { embedLogo } from "../../estimates/utils/estimate-pdf-document";

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const LOOKUP = new Int16Array(128).fill(-1);
for (let index = 0; index < ALPHABET.length; index++)
  LOOKUP[ALPHABET.charCodeAt(index)] = index;

/** Decodifica Base64 canónico (longitud múltiplo de 4, relleno sólo al final); null si no lo es. */
export function decodeBase64(base64: string): Uint8Array | null {
  const length = base64.length;
  if (length === 0 || length % 4 !== 0) return null;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const bytes = new Uint8Array((length / 4) * 3 - padding);
  let out = 0;
  for (let index = 0; index < length; index += 4) {
    let chunk = 0;
    for (let offset = 0; offset < 4; offset++) {
      const code = base64.charCodeAt(index + offset);
      const isPad = code === 61;
      if (isPad && index + offset < length - padding) return null;
      const value = isPad ? 0 : code < 128 ? (LOOKUP[code] ?? -1) : -1;
      if (value < 0) return null;
      chunk = (chunk << 6) | value;
    }
    if (out < bytes.length) bytes[out++] = (chunk >> 16) & 0xff;
    if (out < bytes.length) bytes[out++] = (chunk >> 8) & 0xff;
    if (out < bytes.length) bytes[out++] = chunk & 0xff;
  }
  return bytes;
}

const ascii = (bytes: Uint8Array, start: number, text: string): boolean =>
  bytes.length >= start + text.length &&
  [...text].every((char, index) => bytes[start + index] === char.charCodeAt(0));
const u32 = (bytes: Uint8Array, at: number): number =>
  ((bytes[at]! << 24) |
    (bytes[at + 1]! << 16) |
    (bytes[at + 2]! << 8) |
    bytes[at + 3]!) >>>
  0;
const MAX_SIDE = 65_535;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * Firma, cabecera IHDR de 13 bytes con dimensiones positivas, al menos un fragmento IDAT con datos y
 * fragmentos bien encadenados hasta un IEND que cierra el archivo.
 */
function isPng(bytes: Uint8Array): boolean {
  if (bytes.length < 8 + 25 + 12) return false;
  if (!PNG_SIGNATURE.every((byte, index) => bytes[index] === byte))
    return false;
  if (u32(bytes, 8) !== 13 || !ascii(bytes, 12, "IHDR")) return false;
  const width = u32(bytes, 16);
  const height = u32(bytes, 20);
  if (width < 1 || height < 1 || width > MAX_SIDE || height > MAX_SIDE)
    return false;
  if (width * height > MAX_LOGO_PIXELS) return false;
  let at = 8 + 25;
  let hasData = false;
  while (at + 12 <= bytes.length) {
    const length = u32(bytes, at);
    const next = at + 12 + length;
    if (next > bytes.length) return false;
    if (ascii(bytes, at + 4, "IDAT") && length > 0) hasData = true;
    if (ascii(bytes, at + 4, "IEND"))
      return length === 0 && next === bytes.length && hasData;
    at = next;
  }
  return false;
}

/** SOI, un segmento SOF con dimensiones positivas recorriendo los segmentos, y EOI al final. */
function isJpeg(bytes: Uint8Array): boolean {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return false;
  // Algunas cámaras agregan relleno tras EOI: basta con encontrarlo en el cierre del archivo.
  let end = false;
  for (let at = bytes.length - 2; at >= Math.max(2, bytes.length - 64); at--)
    if (bytes[at] === 0xff && bytes[at + 1] === 0xd9) {
      end = true;
      break;
    }
  if (!end) return false;
  let at = 2;
  while (at + 4 <= bytes.length) {
    if (bytes[at] !== 0xff) return false;
    const marker = bytes[at + 1]!;
    if (marker === 0xff) {
      at += 1;
      continue;
    }
    const size = (bytes[at + 2]! << 8) | bytes[at + 3]!;
    const isStartOfFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isStartOfFrame) {
      if (size < 8 || at + 9 > bytes.length) return false;
      const height = (bytes[at + 5]! << 8) | bytes[at + 6]!;
      const width = (bytes[at + 7]! << 8) | bytes[at + 8]!;
      return width > 0 && height > 0;
    }
    if (marker === 0xda || marker === 0xd9 || size < 2) return false;
    at += 2 + size;
  }
  return false;
}

/** Dimensiones del lienzo según el primer fragmento (VP8X, VP8L o VP8); null si no se pueden leer. */
function webpDimensions(bytes: Uint8Array): [number, number] | null {
  const kind = String.fromCharCode(...bytes.subarray(12, 16));
  if (kind === "VP8X" && bytes.length >= 30)
    return [
      1 + (bytes[24]! | (bytes[25]! << 8) | (bytes[26]! << 16)),
      1 + (bytes[27]! | (bytes[28]! << 8) | (bytes[29]! << 16)),
    ];
  if (kind === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
    // Los 32 bits siguientes a la firma (little-endian): ancho-1, alto-1, alfa y versión.
    const bits =
      (bytes[21]! |
        (bytes[22]! << 8) |
        (bytes[23]! << 16) |
        (bytes[24]! << 24)) >>>
      0;
    return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
  }
  if (
    kind === "VP8 " &&
    bytes.length >= 30 &&
    bytes[23] === 0x9d &&
    bytes[24] === 0x01 &&
    bytes[25] === 0x2a
  )
    return [
      (bytes[26]! | (bytes[27]! << 8)) & 0x3fff,
      (bytes[28]! | (bytes[29]! << 8)) & 0x3fff,
    ];
  return null;
}

/**
 * Contenedor RIFF/WEBP cuyo tamaño declarado coincide, con un primer fragmento de imagen conocido y
 * dimensiones legibles dentro del tope, para rechazarlo antes de que Expo lo decodifique.
 */
function isWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 20 || !ascii(bytes, 0, "RIFF") || !ascii(bytes, 8, "WEBP"))
    return false;
  const riffSize =
    bytes[4]! | (bytes[5]! << 8) | (bytes[6]! << 16) | (bytes[7]! << 24);
  if (riffSize + 8 !== bytes.length && riffSize + 9 !== bytes.length)
    return false;
  const size = webpDimensions(bytes);
  return (
    size !== null &&
    size[0] >= 1 &&
    size[1] >= 1 &&
    size[0] * size[1] <= MAX_LOGO_PIXELS
  );
}

export type LogoMime = "image/png" | "image/jpeg" | "image/webp";

/** true si los bytes tienen la forma del formato declarado. */
export function matchesImageFormat(
  mimeType: LogoMime,
  bytes: Uint8Array,
): boolean {
  switch (mimeType) {
    case "image/png":
      return isPng(bytes);
    case "image/jpeg":
      return isJpeg(bytes);
    case "image/webp":
      return isWebp(bytes);
  }
}

/** Comprueba la estructura de un logo en Base64; false si el Base64 o su contenido no sirven. */
export function isValidLogo(mimeType: LogoMime, base64: string): boolean {
  const bytes = decodeBase64(base64);
  return bytes !== null && matchesImageFormat(mimeType, bytes);
}

/**
 * Además de la estructura, decodifica PNG y JPEG con la misma lógica que el PDF (pdf-lib), de modo que un
 * logo que se importa también se puede incrustar al generar un presupuesto. WebP se convierte en el
 * teléfono con código nativo antes de incrustarse: acá sólo se puede comprobar su estructura y
 * `BackupService` completa la comprobación con esa misma conversión.
 */
export async function isUsableLogo(
  mimeType: LogoMime,
  base64: string,
): Promise<boolean> {
  const bytes = decodeBase64(base64);
  if (bytes === null || !matchesImageFormat(mimeType, bytes)) return false;
  if (mimeType === "image/webp") return true;
  return canEmbed({ bytes, mimeType });
}

/** true si pdf-lib puede incrustar la imagen y guardar el documento, igual que al generar un PDF. */
export async function canEmbed(logo: {
  bytes: Uint8Array;
  mimeType: "image/png" | "image/jpeg";
}): Promise<boolean> {
  try {
    const document = await PDFDocument.create();
    await embedLogo(document, logo);
    // La imagen se decodifica y escribe al guardar el documento.
    await document.save();
    return true;
  } catch {
    return false;
  }
}
