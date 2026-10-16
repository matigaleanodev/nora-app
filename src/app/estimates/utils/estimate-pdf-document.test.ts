import { readFileSync, writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { expect, test } from "vitest";
import { buildEstimatePdf } from "./estimate-pdf-document";
import { estimateFixture } from "../../shared/testing/domain-fixtures";
import { EstimateItemType } from "../models/estimate.model";
const font = new Uint8Array(
  readFileSync(new URL("../../../../assets/NotoSans.ttf", import.meta.url)),
);
const business = {
  displayName: "Galeano Servicios · Ñandú",
  email: "contacto@ejemplo.com",
  updatedAt: "2026-10-16T12:00:00Z",
};
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
