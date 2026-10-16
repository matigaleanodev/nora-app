import { PDFDocument, rgb, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { BusinessProfile } from "../../business/models/business-profile.model";
import { formatCustomerPhone } from "../../customers/models/customer.model";
import { formatCalendarDate } from "../../shared/utils/calendar-date";
import {
  Currency,
  EstimateItemType,
  EstimateStatus,
  type Estimate,
} from "../models/estimate.model";
import {
  calculateEstimateTotal,
  calculateItemSubtotal,
} from "./estimate-totals";
export interface PdfLogo {
  readonly bytes: Uint8Array;
  readonly mimeType: "image/png" | "image/jpeg";
}
const BRAND = rgb(23 / 255, 100 / 255, 91 / 255);
const INK = rgb(32 / 255, 41 / 255, 56 / 255);
const MUTED = rgb(82 / 255, 96 / 255, 113 / 255);
const BORDER = rgb(212 / 255, 218 / 255, 224 / 255);
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const WIDTH = PAGE_WIDTH - MARGIN * 2;
const units: Record<string, string> = {
  m: "m",
  m2: "m²",
  m3: "m³",
  l: "litros",
  unit: "unidades",
  hour: "horas",
  job: "trabajo",
};
const number = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const quantity = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 3 });
const money = (cents: number, currency: Currency): string =>
  `${currency === Currency.USD ? "US$" : "$"} ${number.format(cents / 100)}`;
/** Genera bytes PDF reales sin WebView, impresión del sistema ni recursos de red. */
export async function buildEstimatePdf(
  estimate: Estimate,
  business: BusinessProfile,
  fontBytes: Uint8Array,
  logo?: PdfLogo,
): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  // El subconjunto generado por fontkit omite glifos de Noto Sans; incrustamos la fuente completa.
  const font = await document.embedFont(fontBytes, { subset: false });
  document.setTitle(`Presupuesto ${estimate.number}`);
  document.setAuthor(business.displayName);
  document.setCreator("Nora");
  let page: PDFPage;
  let y = 0;
  const supported = new Set(font.getCharacterSet());
  const printable = (value: string): string =>
    Array.from(
      value.replace(/\t/g, " ").replace(/[\u0000-\u0008\u000b-\u001f]/g, ""),
    )
      .map((character) =>
        character === "\n" || supported.has(character.codePointAt(0)!)
          ? character
          : "?",
      )
      .join("");
  const wrap = (value: string, width: number, size: number): string[] => {
    const result: string[] = [];
    for (const paragraph of printable(value).split(/\r?\n/)) {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        if (!word) continue;
        if (line && font.widthOfTextAtSize(`${line} ${word}`, size) > width) {
          result.push(line);
          line = "";
        }
        for (const character of (line ? " " : "") + word) {
          if (line && font.widthOfTextAtSize(line + character, size) > width) {
            result.push(line);
            line = "";
          }
          line += character;
        }
      }
      result.push(line);
    }
    return result;
  };
  const addPage = (): void => {
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
    if (document.getPageCount() > 1) {
      page.drawText("Presupuesto · continuación", {
        x: MARGIN,
        y,
        size: 10,
        font,
        color: MUTED,
        maxWidth: WIDTH,
      });
      y -= 26;
    }
  };
  const ensure = (height: number): void => {
    if (y - height < MARGIN + 24) addPage();
  };
  const text = (value: string, size = 11, color = INK, width = WIDTH): void => {
    for (const line of wrap(value, width, size)) {
      ensure(size * 1.5);
      page.drawText(line, { x: MARGIN, y: y - size, size, font, color });
      y -= size * 1.5;
    }
  };
  const gap = (height = 14): void => {
    y -= height;
  };
  const rule = (): void => {
    ensure(8);
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 1,
      color: BORDER,
    });
    gap(10);
  };
  const heading = (value: string): void => {
    ensure(54);
    gap(12);
    text(value, 14, BRAND);
    gap(6);
  };
  const contacts = (
    value: BusinessProfile | Estimate["customerSnapshot"],
  ): void => {
    if (value.phone) text(formatCustomerPhone(value.phone), 10, MUTED);
    if (value.email) text(value.email, 10, MUTED);
  };
  addPage();
  if (logo) {
    const image =
      logo.mimeType === "image/png"
        ? await document.embedPng(logo.bytes)
        : await document.embedJpg(logo.bytes);
    const dimensions = image.scaleToFit(130, 64);
    page!.drawImage(image, {
      x: MARGIN,
      y: y - dimensions.height,
      width: dimensions.width,
      height: dimensions.height,
    });
    gap(dimensions.height + 10);
  }
  text(business.displayName, 20, BRAND);
  contacts(business);
  gap(16);
  rule();
  text("Presupuesto", 24);
  text(estimate.number, 14, BRAND);
  text(
    `Emitido: ${formatCalendarDate(estimate.createdAt.slice(0, 10))}`,
    10,
    MUTED,
  );
  if (estimate.status === EstimateStatus.Draft)
    text("BORRADOR", 10, rgb(138 / 255, 87 / 255, 0));
  if (estimate.validUntil)
    text(`Válido hasta: ${formatCalendarDate(estimate.validUntil)}`, 10, MUTED);
  heading("Preparado para");
  text(estimate.customerSnapshot.name, 13);
  contacts(estimate.customerSnapshot);
  const address = estimate.customerSnapshot.address;
  if (address) {
    heading("Lugar del trabajo");
    text(address.name);
    text(
      `${address.street} ${address.streetNumber}${address.floor ? ` · Piso ${address.floor}` : ""}${address.apartment ? ` · Departamento ${address.apartment}` : ""}`,
      10,
      MUTED,
    );
    text(`${address.city}, ${address.province}`, 10, MUTED);
  }
  heading("Trabajo a realizar");
  text(estimate.description);
  const tableRow = (cells: readonly string[], header = false): void => {
    const widths = [205, 74, 110, WIDTH - 389];
    const lines = cells.map((cell, index) =>
      wrap(cell, widths[index] - 24, header ? 9 : 10),
    );
    const length = Math.max(...lines.map((cell) => cell.length));
    if (
      y - Math.min(length * 15 + 12, PAGE_HEIGHT - MARGIN * 2 - 60) <
      MARGIN + 24
    ) {
      addPage();
      if (!header)
        tableRow(
          ["Descripción", "Cantidad", "Precio unitario", "Subtotal"],
          true,
        );
    }
    for (let line = 0; line < length; line++) {
      if (y - 15 < MARGIN + 24) {
        addPage();
        if (!header)
          tableRow(
            ["Descripción", "Cantidad", "Precio unitario", "Subtotal"],
            true,
          );
      }
      let x = MARGIN;
      lines.forEach((cell, index) => {
        const content = cell[line] ?? "";
        const size = header ? 9 : 10;
        page.drawText(content, {
          x: index
            ? x + widths[index] - 6 - font.widthOfTextAtSize(content, size)
            : x,
          y: y - size,
          font,
          size,
          color: header ? MUTED : INK,
        });
        x += widths[index];
      });
      y -= 15;
    }
    gap(6);
    rule();
  };
  for (const type of [EstimateItemType.Material, EstimateItemType.Labor]) {
    const items = estimate.items.filter((item) => item.type === type);
    if (!items.length) continue;
    heading(type === EstimateItemType.Material ? "Materiales" : "Mano de obra");
    tableRow(["Descripción", "Cantidad", "Precio unitario", "Subtotal"], true);
    for (const item of items)
      tableRow([
        item.description,
        `${quantity.format(item.quantity)} ${units[item.unit]}`,
        money(item.unitPriceCents, estimate.currency),
        money(calculateItemSubtotal(item), estimate.currency),
      ]);
    text(
      `Subtotal: ${money(calculateEstimateTotal(items), estimate.currency)}`,
      11,
      MUTED,
    );
  }
  if (!estimate.items.length) {
    heading("Materiales y mano de obra");
    text("Sin materiales ni tareas cargados.", 11, MUTED);
  }
  ensure(70);
  gap(16);
  rule();
  text(`Total ${estimate.currency}`, 12);
  text(
    money(calculateEstimateTotal(estimate.items), estimate.currency),
    26,
    BRAND,
  );
  if (estimate.notes) {
    heading("Notas y condiciones");
    text(estimate.notes);
  }
  const pages = document.getPages();
  pages.forEach((value, index) =>
    value.drawText(`Preparado con Nora · ${index + 1} / ${pages.length}`, {
      x: MARGIN,
      y: 28,
      font,
      size: 8,
      color: MUTED,
    }),
  );
  return document.save();
}
