import { readFileSync, writeFileSync } from "node:fs";
import {
  PDFDocument,
  PDFName,
  PDFDict,
  PDFArray,
  PDFRawStream,
  decodePDFRawStream,
  type PDFPage,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { expect, test } from "vitest";
import { buildEstimatePdf } from "./estimate-pdf-document";
import { estimateFixture } from "../../shared/testing/domain-fixtures";
import {
  Currency,
  EstimateItemType,
  MeasurementUnit,
} from "../models/estimate.model";
const font = {
  regular: new Uint8Array(
    readFileSync(new URL("../../../../assets/NotoSans.ttf", import.meta.url)),
  ),
  bold: new Uint8Array(
    readFileSync(
      new URL("../../../../assets/NotoSans-Bold.ttf", import.meta.url),
    ),
  ),
};
const business = {
  displayName: "Galeano Servicios · Ñandú",
  email: "contacto@ejemplo.com",
  updatedAt: "2026-10-16T12:00:00Z",
};
const logo = {
  bytes: new Uint8Array(
    readFileSync(new URL("../../../../assets/icon.png", import.meta.url)),
  ),
  mimeType: "image/png" as const,
};
const readStream = (dict: PDFDict, key: string): Uint8Array => {
  const stream = dict.lookup(PDFName.of(key));
  if (!(stream instanceof PDFRawStream)) throw new Error(`Falta ${key}`);
  return decodePDFRawStream(stream).decode();
};

/** Lee el texto emitido por pdf-lib con los IDs y mapas Unicode de la fuente incluida. */
function pageText(page: PDFPage): string {
  const decoder = new TextDecoder();
  const fonts = page.node.Resources()!.lookup(PDFName.of("Font"), PDFDict);
  const maps = new Map(
    fonts.entries().map(([name, ref]) => {
      const face = page.doc.context.lookup(ref, PDFDict);
      const cmap = decoder.decode(readStream(face, "ToUnicode"));
      return [
        name.asString(),
        new Map(
          [...cmap.matchAll(/^<([A-F0-9]+)> <([A-F0-9]+)>$/gm)].map(
            ([, glyph, code]) => [
              glyph,
              String.fromCodePoint(parseInt(code, 16)),
            ],
          ),
        ),
      ];
    }),
  );
  const contents = page.node.lookup(PDFName.of("Contents"), PDFArray);
  const operators = contents
    .asArray()
    .map((ref) => {
      const stream = page.doc.context.lookup(ref);
      if (!(stream instanceof PDFRawStream))
        throw new Error("Contenido PDF inesperado");
      return decoder.decode(decodePDFRawStream(stream).decode());
    })
    .join("\n");
  let glyphs = maps.values().next().value;
  const lines: string[] = [];
  for (const [, face, text] of operators.matchAll(
    /(\/[-\w]+) [\d.]+ Tf|<([0-9A-F]+)> Tj/g,
  )) {
    if (face) glyphs = maps.get(face);
    else
      lines.push(
        text
          .match(/.{4}/g)!
          .map((glyph) => glyphs!.get(glyph))
          .join(""),
      );
  }
  return lines.join("\n");
}

test("dos renglones, logo y contactos no separan el total ni las notas a otra página", async () => {
  const estimate = {
    ...estimateFixture,
    customerSnapshot: {
      ...estimateFixture.customerSnapshot,
      address: undefined,
    },
    notes: "Materiales incluidos. Trabajo sujeto a visita.",
    items: [
      {
        ...estimateFixture.items[0],
        quantity: 1,
        unit: MeasurementUnit.Unit,
        unitPriceCents: 1500000,
      },
      {
        ...estimateFixture.items[0],
        id: "labor",
        type: EstimateItemType.Labor,
        quantity: 13,
        unitPriceCents: 200000,
      },
    ],
  };
  const bytes = await buildEstimatePdf(
    estimate,
    {
      ...business,
      phone: { areaCode: "376", number: "4123456", whatsapp: true },
    },
    font,
    logo,
  );
  expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  if (process.env["NORA_PDF_PREVIEW"])
    writeFileSync("/tmp/nora-compact-two.pdf", bytes);
});

test.each([6, 12])(
  "mantiene %i renglones breves en una página A4 legible",
  async (count) => {
    const estimate = {
      ...estimateFixture,
      items: Array.from({ length: count }, (_, index) => ({
        ...estimateFixture.items[0],
        id: `compact-${index}`,
        description: `Material o tarea ${index + 1}`,
        type: index % 2 ? EstimateItemType.Labor : EstimateItemType.Material,
      })),
    };
    const bytes = await buildEstimatePdf(estimate, business, font, logo);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
    if (process.env["NORA_PDF_PREVIEW"])
      writeFileSync(`/tmp/nora-compact-${count}.pdf`, bytes);
  },
);
test("genera un PDF A4 real con fuente offline y datos acentuados", async () => {
  const bytes = await buildEstimatePdf(estimateFixture, business, font);
  const document = await PDFDocument.load(bytes);
  expect(document.getPageCount()).toBeGreaterThan(0);
  expect(document.getPage(0).getSize().width).toBeCloseTo(595.28);
  expect(document.getAuthor()).toBe(business.displayName);
  expect(document.getTitle()).toContain("P-001");
  if (process.env["NORA_PDF_PREVIEW"])
    writeFileSync("/tmp/nora-identity-preview.pdf", bytes);
});

test("el subconjunto conserva contornos legibles de letras, acentos y símbolos en ambos pesos", async () => {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz ÁÉÍÓÚÜÑ áéíóúüñ São François Straße Łódź €²³ ΩЖ 0123456789";
  const bytes = await buildEstimatePdf(
    { ...estimateFixture, description: alphabet },
    { ...business, displayName: alphabet },
    font,
  );
  expect(bytes.length).toBeLessThan(50000);
  const document = await PDFDocument.load(bytes);
  let checked = 0;
  for (const page of document.getPages()) {
    const faces = page.node.Resources()!.lookup(PDFName.of("Font"), PDFDict);
    for (const [, ref] of faces.entries()) {
      const face = document.context.lookup(ref, PDFDict);
      const cmap = new TextDecoder().decode(readStream(face, "ToUnicode"));
      const descendant = face
        .lookup(PDFName.of("DescendantFonts"), PDFArray)
        .lookup(0, PDFDict);
      const descriptor = descendant.lookup(
        PDFName.of("FontDescriptor"),
        PDFDict,
      );
      const embedded = fontkit.create(readStream(descriptor, "FontFile2"));
      for (const match of cmap.matchAll(/^<([A-F0-9]+)> <([A-F0-9]+)>$/gm)) {
        const id = parseInt(match[1], 16);
        const codePoint = parseInt(match[2], 16);
        if (!id || codePoint === 32) continue;
        expect(
          embedded.getGlyph(id).path.toSVG(),
          `Contorno de ${match[2]}`,
        ).not.toBe("");
        checked++;
      }
    }
  }
  expect(checked).toBeGreaterThan(150);
});
test.each([
  [1, false],
  [1, true],
  [20, false],
  [20, true],
  [50, false],
  [50, true],
] as const)(
  "genera %i renglones con logo=%s, paginación y total completos",
  async (count, withLogo) => {
    const estimate = {
      ...estimateFixture,
      notes:
        count === 50
          ? `${"Condiciones del servicio. ".repeat(100)}Fin de condiciones.`
          : "Fin de condiciones.",
      items: Array.from({ length: count }, (_, index) => ({
        ...estimateFixture.items[0],
        id: `line-${index}`,
        type: index % 2 ? EstimateItemType.Labor : EstimateItemType.Material,
        description: `Renglón ${index + 1}. ${count === 50 ? "Descripción extensa de trabajo ".repeat(5) : ""}`,
        quantity: 1,
        unitPriceCents: 10050,
      })),
    };
    const before = structuredClone(estimate);
    const bytes = await buildEstimatePdf(
      estimate,
      business,
      font,
      withLogo ? logo : undefined,
    );
    const pages = (await PDFDocument.load(bytes)).getPages();
    if (count === 1) expect(pages).toHaveLength(1);
    if (count === 20) expect(pages).toHaveLength(2);
    if (count === 50) expect(pages.length).toBeGreaterThan(4);
    const firstPageXObjects = pages[0].node
      .Resources()!
      .lookupMaybe(PDFName.of("XObject"), PDFDict);
    expect(firstPageXObjects?.entries().length ?? 0).toBe(withLogo ? 1 : 0);
    const textByPage = pages.map(pageText);
    const text = textByPage.join("\n");
    for (let index = 1; index <= count; index++)
      expect(text).toContain(`Renglón ${index}.`);
    const total = {
      1: "$ 100,50",
      20: "$ 2.010,00",
      50: "$ 5.025,00",
    } as const;
    expect(text).toContain(`Total · ARS\n${total[count]}`);
    expect(text).toMatch(/Fin\s+de condiciones\./);
    expect(text).toContain("BORRADOR");
    if (count === 50) {
      const continued = textByPage.find((value) =>
        value.includes("Materiales · continuación"),
      );
      expect(continued).toContain(
        "Descripción\nCantidad\nPrecio unit.\nSubtotal",
      );
    }
    for (const [index, content] of textByPage.entries())
      expect(content).toContain(
        `Preparado con Nora · ${index + 1} / ${pages.length}`,
      );
    expect(estimate).toEqual(before);
    if (process.env["NORA_PDF_PREVIEW"])
      writeFileSync(
        `/tmp/nora-${count}-items-${withLogo ? "logo" : "no-logo"}.pdf`,
        bytes,
      );
  },
);

test("el PDF conserva el último centavo del máximo importe válido", async () => {
  const bytes = await buildEstimatePdf(
    {
      ...estimateFixture,
      currency: Currency.USD,
      items: [
        {
          ...estimateFixture.items[0],
          quantity: 1,
          unitPriceCents: Number.MAX_SAFE_INTEGER,
        },
      ],
    },
    business,
    font,
  );
  const document = await PDFDocument.load(bytes);
  expect(pageText(document.getPage(0))).toContain(
    "Total · USD\nUS$ 90.071.992.547.409,91",
  );
});

test("un logo antiguo ilegible indica cómo repararlo", async () => {
  await expect(
    buildEstimatePdf(estimateFixture, business, font, {
      bytes: new Uint8Array([1, 2, 3]),
      mimeType: "image/png",
    }),
  ).rejects.toThrow("Volvé a elegirlo en Mi negocio");
});
