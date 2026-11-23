import { deflateSync } from "node:zlib";

/** Imágenes mínimas con la estructura de cada formato, para probar la validación de logos. */
const toBase64 = (bytes: Uint8Array): string =>
  Buffer.from(bytes).toString("base64");
const u32 = (value: number): number[] => [
  (value >>> 24) & 0xff,
  (value >>> 16) & 0xff,
  (value >>> 8) & 0xff,
  value & 0xff,
];
const text = (value: string): number[] =>
  [...value].map((char) => char.charCodeAt(0));
const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
/** Fragmento PNG con longitud, tipo, datos y CRC correctos. */
function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  out.set(u32(data.length), 0);
  out.set(text(type), 4);
  out.set(data, 8);
  out.set(u32(crc32(out.subarray(4, 8 + data.length))), 8 + data.length);
  return out;
}
const join = (parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
};
const IHDR = chunk(
  "IHDR",
  new Uint8Array([...u32(1), ...u32(1), 8, 6, 0, 0, 0]),
);
const IEND = chunk("IEND", new Uint8Array());
/** Un píxel RGBA rojo: filtro 0 y cuatro bytes, comprimidos como zlib. */
const IDAT = chunk(
  "IDAT",
  new Uint8Array(deflateSync(Buffer.from([0, 255, 0, 0, 255]))),
);
const BASE = SIGNATURE.length + IHDR.length + IDAT.length + IEND.length;

/** PNG real de 1x1, con un fragmento auxiliar tEXt de relleno para llegar al tamaño pedido. */
export function pngBytes(size = BASE): Uint8Array {
  const filler = size - BASE;
  if (filler !== 0 && filler < 12) throw new Error("Tamaño demasiado chico.");
  const padding =
    filler === 0 ? [] : [chunk("tEXt", new Uint8Array(filler - 12).fill(65))];
  return join([new Uint8Array(SIGNATURE), IHDR, ...padding, IDAT, IEND]);
}
export const pngBase64 = (size?: number): string => toBase64(pngBytes(size));

/** Cabecera y cierre correctos pero sin datos de imagen: la estructura mínima que antes pasaba. */
export const pngWithoutDataBase64 = (size = 0): string => {
  const filler = size - (SIGNATURE.length + IHDR.length + IEND.length);
  const padding =
    filler > 12 ? [chunk("tEXt", new Uint8Array(filler - 12).fill(65))] : [];
  return toBase64(join([new Uint8Array(SIGNATURE), IHDR, ...padding, IEND]));
};

/** Estructura completa con un tipo de color inexistente: la forma pasa y pdf-lib no puede decodificarlo. */
export const pngUndecodableBase64 = (): string =>
  toBase64(
    join([
      new Uint8Array(SIGNATURE),
      chunk("IHDR", new Uint8Array([...u32(1), ...u32(1), 8, 5, 0, 0, 0])),
      IDAT,
      IEND,
    ]),
  );

/** JPEG con SOI, un SOF0 de 1x1 y EOI. */
export const jpegBase64 = (): string =>
  toBase64(
    new Uint8Array([
      0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01,
      0x01, 0x11, 0x00, 0xff, 0xd9,
    ]),
  );

/** WebP con contenedor RIFF y un encabezado VP8L que declara las dimensiones pedidas (1x1 por defecto). */
export const webpBase64 = (width = 1, height = 1): string => {
  const bits = (width - 1) | ((height - 1) << 14);
  const payload = [
    ...text("WEBP"),
    ...text("VP8L"),
    ...[5, 0, 0, 0],
    0x2f,
    bits & 0xff,
    (bits >>> 8) & 0xff,
    (bits >>> 16) & 0xff,
    (bits >>> 24) & 0xff,
    0,
  ];
  const size = payload.length;
  return toBase64(
    new Uint8Array([
      ...text("RIFF"),
      size & 0xff,
      (size >> 8) & 0xff,
      0,
      0,
      ...payload,
    ]),
  );
};
