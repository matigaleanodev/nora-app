import { PDFDocument, rgb, type PDFPage, type PDFFont } from "pdf-lib";
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
export interface PdfFonts {
  readonly regular: Uint8Array;
  readonly bold: Uint8Array;
}
const BRAND = rgb(23 / 255, 100 / 255, 91 / 255);
const SOFT = rgb(231 / 255, 242 / 255, 239 / 255);
const INK = rgb(32 / 255, 41 / 255, 56 / 255);
const MUTED = rgb(82 / 255, 96 / 255, 113 / 255);
const BORDER = rgb(212 / 255, 218 / 255, 224 / 255);
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const WIDTH = PAGE_WIDTH - MARGIN * 2;
const BOTTOM = MARGIN;
const units: Record<string, string> = {
  m: "m",
  m2: "m²",
  m3: "m³",
  l: "l",
  unit: "un.",
  hour: "h",
  job: "trab.",
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
  fonts: PdfFonts,
  logo?: PdfLogo,
): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  // prepare-fonts.py alinea los contornos para reducir la fuente sin perder glifos en fontkit.
  const [font, bold] = await Promise.all([
    document.embedFont(fonts.regular, { subset: true }),
    document.embedFont(fonts.bold, { subset: true }),
  ]);
  document.setTitle(`Presupuesto ${estimate.number}`);
  document.setAuthor(business.displayName);
  document.setCreator("Nora");
  let page!: PDFPage;
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
  const widthsByFont = new Map<PDFFont, Map<string, number>>();
  const measure = (value: string, size: number, face = font): number => {
    let widths = widthsByFont.get(face);
    if (!widths) widthsByFont.set(face, (widths = new Map()));
    let width = widths.get(value);
    if (width === undefined) {
      width = face.widthOfTextAtSize(value, 1);
      widths.set(value, width);
    }
    return width * size;
  };
  const wrap = (
    value: string,
    width: number,
    size: number,
    face = font,
  ): string[] => {
    const result: string[] = [];
    for (const paragraph of printable(value).split(/\r?\n/)) {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        if (!word) continue;
        const candidate = line ? `${line} ${word}` : word;
        if (measure(candidate, size, face) <= width) {
          line = candidate;
          continue;
        }
        if (line) {
          result.push(line);
          line = "";
        }
        if (measure(word, size, face) <= width) {
          line = word;
          continue;
        }
        // Sólo las palabras más anchas que una columna requieren partir caracteres.
        const characters = Array.from(word);
        let offset = 0;
        while (offset < characters.length) {
          let low = 1;
          let high = characters.length - offset;
          while (low < high) {
            const middle = Math.ceil((low + high) / 2);
            if (
              measure(
                characters.slice(offset, offset + middle).join(""),
                size,
                face,
              ) <= width
            )
              low = middle;
            else high = middle - 1;
          }
          line = characters.slice(offset, offset + low).join("");
          offset += low;
          if (offset < characters.length) result.push(line);
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
    if (y - height < BOTTOM) addPage();
  };
  const text = (
    value: string,
    size = 10,
    color = INK,
    width = WIDTH,
    face = font,
  ): void => {
    for (const line of wrap(value, width, size, face)) {
      ensure(size * 1.35);
      page.drawText(line, { x: MARGIN, y: y - size, size, font: face, color });
      y -= size * 1.35;
    }
  };
  const gap = (height = 10): void => {
    y -= height;
  };
  const rule = (color = BORDER, thickness = 1): void => {
    ensure(8);
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness,
      color,
    });
    gap(8);
  };
  const heading = (value: string): void => {
    ensure(48);
    gap(8);
    text(value, 12, INK, WIDTH, bold);
    gap(4);
  };
  const contactLines = (
    value: BusinessProfile | Estimate["customerSnapshot"],
  ): string[] =>
    [
      value.phone ? formatCustomerPhone(value.phone) : "",
      value.email ?? "",
    ].filter(Boolean);
  const column = (
    value: string,
    x: number,
    width: number,
    top: number,
    size = 10,
    color = INK,
    face = font,
    right = false,
  ): number => {
    const lines = wrap(value, width, size, face);
    lines.forEach((line, index) =>
      page.drawText(line, {
        x: right ? x + width - measure(line, size, face) : x,
        y: top - size - index * size * 1.35,
        size,
        font: face,
        color,
      }),
    );
    return lines.length * size * 1.35;
  };
  addPage();
  const headerTop = y;
  let logoWidth = 0;
  if (logo) {
    const image =
      logo.mimeType === "image/png"
        ? await document.embedPng(logo.bytes)
        : await document.embedJpg(logo.bytes);
    const dimensions = image.scaleToFit(56, 56);
    page!.drawImage(image, {
      x: MARGIN,
      y: y - dimensions.height,
      width: dimensions.width,
      height: dimensions.height,
    });
    logoWidth = 68;
  }
  const leftWidth = WIDTH - 184 - logoWidth;
  const businessHeight = column(
    business.displayName,
    MARGIN + logoWidth,
    leftWidth,
    headerTop,
    18,
    BRAND,
    bold,
  );
  const contactHeight = contactLines(business).length
    ? column(
        contactLines(business).join("\n"),
        MARGIN + logoWidth,
        leftWidth,
        headerTop - businessHeight - 5,
        9,
        MUTED,
      )
    : 0;
  const metaX = PAGE_WIDTH - MARGIN - 164;
  column("PRESUPUESTO", metaX, 164, headerTop, 9, MUTED, font, true);
  const numberHeight = column(
    estimate.number,
    metaX,
    164,
    headerTop - 16,
    22,
    INK,
    bold,
    true,
  );
  const metadata = [
    `Emitido: ${formatCalendarDate(estimate.createdAt.slice(0, 10))}`,
  ];
  if (estimate.validUntil)
    metadata.push(`Válido hasta: ${formatCalendarDate(estimate.validUntil)}`);
  if (estimate.status === EstimateStatus.Draft) metadata.push("BORRADOR");
  const metaHeight = column(
    metadata.join("\n"),
    metaX,
    164,
    headerTop - 20 - numberHeight,
    9,
    MUTED,
    font,
    true,
  );
  y =
    headerTop -
    Math.max(
      logo ? 56 : 0,
      businessHeight + contactHeight + 5,
      20 + numberHeight + metaHeight,
    ) -
    14;
  rule(BRAND, 1.3);
  const address = estimate.customerSnapshot.address;
  const customerWidth = address ? (WIDTH - 24) / 2 : WIDTH;
  const customerTop = y - 10;
  column("Preparado para", MARGIN, customerWidth, customerTop, 11, INK, bold);
  const customerNameHeight = column(
    estimate.customerSnapshot.name,
    MARGIN,
    customerWidth,
    customerTop - 18,
    10,
    INK,
    bold,
  );
  const customerContacts = contactLines(estimate.customerSnapshot).join("\n");
  const customerHeight =
    customerNameHeight +
    (customerContacts
      ? column(
          customerContacts,
          MARGIN,
          customerWidth,
          customerTop - 18 - customerNameHeight,
          10,
          MUTED,
        )
      : 0);
  let addressHeight = 0;
  if (address) {
    const addressX = MARGIN + customerWidth + 24;
    column(
      "Lugar del trabajo",
      addressX,
      customerWidth,
      customerTop,
      11,
      INK,
      bold,
    );
    addressHeight = column(
      `${address.name}\n${address.street} ${address.streetNumber}${address.floor ? ` · Piso ${address.floor}` : ""}${address.apartment ? ` · Departamento ${address.apartment}` : ""}\n${address.city}, ${address.province}`,
      addressX,
      customerWidth,
      customerTop - 18,
      10,
    );
  }
  y = customerTop - 18 - Math.max(customerHeight, addressHeight) - 8;
  gap(8);
  const workLines = wrap(estimate.description, WIDTH - 24, 10);
  let workOffset = 0;
  do {
    if (y - 58 < BOTTOM) addPage();
    const count = Math.min(
      workLines.length - workOffset,
      Math.floor((y - BOTTOM - 40) / 13.5),
    );
    const height = 40 + count * 13.5;
    page.drawSvgPath(
      `M 6 0 H ${WIDTH - 6} Q ${WIDTH} 0 ${WIDTH} 6 V ${height - 6} Q ${WIDTH} ${height} ${WIDTH - 6} ${height} H 6 Q 0 ${height} 0 ${height - 6} V 6 Q 0 0 6 0 Z`,
      {
        x: MARGIN,
        y,
        color: SOFT,
      },
    );
    column(
      workOffset ? "Trabajo a realizar · continuación" : "Trabajo a realizar",
      MARGIN + 12,
      WIDTH - 24,
      y - 10,
      11,
      BRAND,
      bold,
    );
    column(
      workLines.slice(workOffset, workOffset + count).join("\n"),
      MARGIN + 12,
      WIDTH - 24,
      y - 30,
      10,
    );
    y -= height + 8;
    workOffset += count;
  } while (workOffset < workLines.length);
  const widths = [WIDTH - 282, 76, 100, 106];
  const tableRow = (
    cells: readonly string[],
    header: boolean,
    continued: () => void,
    reserveAfter = 0,
  ): void => {
    const size = header ? 9 : 10;
    const lineHeight = 13;
    const lines = cells.map((cell, index) =>
      wrap(cell, widths[index] - 12, size, header ? bold : font),
    );
    const length = Math.max(...lines.map((cell) => cell.length));
    // Mantener renglón y subtotal juntos cuando caben en una página; partir sólo textos extraordinarios.
    if (
      !header &&
      length * lineHeight + 12 + reserveAfter <=
        PAGE_HEIGHT - MARGIN - BOTTOM - 70 &&
      y - length * lineHeight - 12 - reserveAfter < BOTTOM
    ) {
      continued();
    }
    gap(4);
    for (let line = 0; line < length; line++) {
      if (y - lineHeight - 8 < BOTTOM) continued();
      let x = MARGIN;
      lines.forEach((cell, index) => {
        const content = cell[line] ?? "";
        page.drawText(content, {
          x: index
            ? x +
              widths[index] -
              (index === widths.length - 1 ? 0 : 6) -
              measure(content, size, header ? bold : font)
            : x,
          y: y - size,
          font: header ? bold : font,
          size,
          color: header ? MUTED : INK,
        });
        x += widths[index];
      });
      y -= lineHeight;
    }
    gap(3);
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 0.5,
      color: BORDER,
    });
  };
  for (const type of [EstimateItemType.Material, EstimateItemType.Labor]) {
    const items = estimate.items.filter((item) => item.type === type);
    if (!items.length) continue;
    const label =
      type === EstimateItemType.Material ? "Materiales" : "Mano de obra";
    const headers = ["Descripción", "Cantidad", "Precio unit.", "Subtotal"];
    const continued = (): void => {
      addPage();
      text(`${label} · continuación`, 11, BRAND);
      gap(4);
      tableRow(headers, true, continued);
    };
    heading(label);
    tableRow(headers, true, continued);
    for (const [index, item] of items.entries())
      tableRow(
        [
          item.description,
          `${quantity.format(item.quantity)} ${units[item.unit]}`,
          money(item.unitPriceCents, estimate.currency),
          money(calculateItemSubtotal(item), estimate.currency),
        ],
        false,
        continued,
        index === items.length - 1 ? 23 : 0,
      );
    ensure(23);
    gap(5);
    const subtotalLabel = `Subtotal ${label.toLowerCase()}`;
    const subtotal = money(calculateEstimateTotal(items), estimate.currency);
    const subtotalX = PAGE_WIDTH - MARGIN - measure(subtotal, 10, bold);
    page.drawText(subtotalLabel, {
      x: subtotalX - 16 - measure(subtotalLabel, 10),
      y: y - 10,
      size: 10,
      font,
      color: MUTED,
    });
    page.drawText(subtotal, {
      x: subtotalX,
      y: y - 10,
      size: 10,
      font: bold,
      color: INK,
    });
    gap(16);
  }
  if (!estimate.items.length) {
    heading("Materiales y mano de obra");
    text("Sin materiales ni tareas cargados.", 11, MUTED);
  }
  ensure(estimate.notes ? 90 : 62);
  gap(10);
  rule(BRAND, 1.3);
  page.drawText(`Total · ${estimate.currency}`, {
    x: MARGIN,
    y: y - 22,
    size: 12,
    font: bold,
    color: INK,
  });
  const total = money(
    calculateEstimateTotal(estimate.items),
    estimate.currency,
  );
  const totalSize = Math.min(26, 250 / measure(total, 1, bold));
  page.drawText(total, {
    x: PAGE_WIDTH - MARGIN - measure(total, totalSize, bold),
    y: y - 26,
    size: totalSize,
    font: bold,
    color: BRAND,
  });
  gap(38);
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
