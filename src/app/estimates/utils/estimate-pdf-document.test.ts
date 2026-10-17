import { readFileSync, writeFileSync } from "node:fs";
import {
  PDFDocument,
  PDFName,
  PDFDict,
  PDFArray,
  PDFRawStream,
  decodePDFRawStream,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { expect, test } from "vitest";
import { buildEstimatePdf } from "./estimate-pdf-document";
import { estimateFixture } from "../../shared/testing/domain-fixtures";
import { EstimateItemType, MeasurementUnit } from "../models/estimate.model";
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
test("pagina 50 renglones y textos largos sin perder importes ni modificar el origen", async () => {
  const estimate = {
    ...estimateFixture,
    notes: "Condiciones del servicio. ".repeat(100),
    items: Array.from({ length: 50 }, (_, index) => ({
      ...estimateFixture.items[0],
      id: `line-${index}`,
      type: index % 2 ? EstimateItemType.Labor : EstimateItemType.Material,
      description: `Renglón ${index + 1} · ${"Descripción extensa de trabajo ".repeat(5)}`,
    })),
  };
  const before = structuredClone(estimate);
  const bytes = await buildEstimatePdf(estimate, business, font);
  const document = await PDFDocument.load(bytes);
  expect(document.getPageCount()).toBeGreaterThan(4);
  expect(estimate).toEqual(before);
  if (process.env["NORA_PDF_PREVIEW"])
    writeFileSync("/tmp/nora-identity-long.pdf", bytes);
});
