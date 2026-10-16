import { describe, expect, test } from "vitest";
import type { BusinessProfile } from "../../business/models/business-profile.model";
import {
  Currency,
  EstimateItemType,
  EstimateStatus,
  MeasurementUnit,
  type Estimate,
} from "../models/estimate.model";
import { buildEstimatePdfHtml } from "./estimate-pdf";

const business: BusinessProfile = {
  displayName: "Juan Pérez · Electricidad",
  phone: { areaCode: "376", number: "4123456", whatsapp: true },
  email: "juan@example.com",
  updatedAt: "2026-10-14T12:00:00.000Z",
};
const estimate: Estimate = {
  id: "estimate-id",
  clientId: "customer-id",
  createdAt: "2026-10-14T23:59:00.000Z",
  updatedAt: "2026-10-15T12:00:00.000Z",
  number: "P-2026-001",
  customerSnapshot: {
    name: "Ana García",
    phone: { areaCode: "11", number: "41234567", whatsapp: false },
    email: "ana@example.com",
    address: {
      id: "address-id",
      name: "Casa",
      street: "San Martín",
      streetNumber: "1234",
      city: "Posadas",
      province: "Misiones",
      floor: "2",
      apartment: "B",
    },
  },
  description: "Instalación eléctrica de cocina",
  items: [
    {
      id: "material-id",
      description: "Cable de 2,5 mm",
      type: EstimateItemType.Material,
      quantity: 2.5,
      unit: MeasurementUnit.Meter,
      unitPriceCents: 12345,
    },
    {
      id: "labor-id",
      description: "Instalación de tomas",
      type: EstimateItemType.Labor,
      quantity: 1,
      unit: MeasurementUnit.Job,
      unitPriceCents: 100000,
    },
  ],
  currency: Currency.ARS,
  status: EstimateStatus.Draft,
  validUntil: "2026-11-15",
  notes: "Incluye retiro de materiales.\nCoordinar horario antes de la visita.",
};

const logoDataUri =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mNk+P8fAAMBAgAnKZ5HAAAAAElFTkSuQmCC";

describe("plantilla PDF del presupuesto", () => {
  test("incluye negocio, cliente y dirección de la copia guardada", () => {
    const html = buildEstimatePdfHtml(estimate, business);
    for (const text of [
      business.displayName,
      "+5493764123456",
      business.email,
      estimate.customerSnapshot.name,
      "+5491141234567",
      "ana@example.com",
      "Casa",
      "San Martín 1234",
      "Piso 2",
      "Departamento B",
      "Posadas, Misiones",
      estimate.description,
      estimate.notes,
    ]) {
      expect(html).toContain(text);
    }
    expect(html).not.toContain(estimate.clientId);
    expect(html).not.toContain(estimate.customerSnapshot.address!.id);
  });

  test.each([
    { currency: Currency.ARS, prefix: "$", totalLabel: "Total ARS" },
    { currency: Currency.USD, prefix: "US$", totalLabel: "Total USD" },
  ])(
    "muestra importes y moneda $currency sin convertir valores",
    ({ currency, prefix, totalLabel }) => {
      const html = buildEstimatePdfHtml({ ...estimate, currency }, business);
      expect(html).toContain(`${prefix} 123,45`);
      expect(html).toContain(`${prefix} 308,63`);
      expect(html).toContain(`${prefix} 1.308,63`);
      expect(html).toContain(totalLabel);
      expect(html).toContain("Material</div>");
      expect(html).toContain("Mano de obra</div>");
      expect(html).toContain('class="numeric">2,5</td>');
    },
  );

  test("redondea cada parcial en centavos antes de sumar el total", () => {
    const items = ["a", "b"].map((id) => ({
      ...estimate.items[0],
      id,
      quantity: 0.5,
      unitPriceCents: 1,
    }));
    const html = buildEstimatePdfHtml({ ...estimate, items }, business);
    expect(html.match(/\$ 0,01<\/td>/g)).toHaveLength(4);
    expect(html).toContain('class="numeric">$ 0,02</span>');
    expect(() =>
      buildEstimatePdfHtml(
        { ...estimate, items: [{ ...items[0], quantity: 0.1234 }] },
        business,
      ),
    ).toThrow("tres decimales");
  });

  test("traduce todas las unidades y conserva cantidades de tres decimales", () => {
    const items = Object.values(MeasurementUnit).map((unit) => ({
      ...estimate.items[0],
      id: unit,
      unit,
      quantity: 1.125,
    }));
    const html = buildEstimatePdfHtml({ ...estimate, items }, business);
    for (const label of [
      "m",
      "m²",
      "m³",
      "Litros",
      "Unidades",
      "Horas",
      "Trabajo",
    ]) {
      expect(html).toContain(`<td>${label}</td>`);
    }
    expect(html.match(/class="numeric">1,125<\/td>/g)).toHaveLength(7);
  });

  test("muestra la vigencia como fecha de calendario sin tomar fechas de creación o modificación", () => {
    const html = buildEstimatePdfHtml(estimate, business);
    expect(html).toContain("Válido hasta <strong>15/11/2026</strong>");
    expect(html).not.toContain(estimate.createdAt);
    expect(html).not.toContain(estimate.updatedAt);
    expect(html).not.toContain("Fecha de emisión");
    expect(
      buildEstimatePdfHtml({ ...estimate, validUntil: undefined }, business),
    ).not.toContain("Válido hasta");
    expect(
      buildEstimatePdfHtml({ ...estimate, validUntil: "2026-02-30" }, business),
    ).not.toContain("Válido hasta");
  });

  test("escapa contenido externo en todos los campos y conserva espacios y saltos", () => {
    const unsafe =
      "<script src=\"https://evil.example/a.js\">& 'texto'</script>\n  segunda línea";
    const html = buildEstimatePdfHtml(
      {
        ...estimate,
        number: unsafe,
        customerSnapshot: {
          name: unsafe,
          email: unsafe,
          phone: { areaCode: unsafe, number: unsafe, whatsapp: false },
          address: {
            ...estimate.customerSnapshot.address!,
            name: unsafe,
            street: unsafe,
            streetNumber: unsafe,
            city: unsafe,
            province: unsafe,
            floor: unsafe,
            apartment: unsafe,
          },
        },
        description: unsafe,
        notes: unsafe,
        items: [{ ...estimate.items[0], description: unsafe }],
      },
      {
        ...business,
        displayName: unsafe,
        email: unsafe,
        phone: { areaCode: unsafe, number: unsafe, whatsapp: false },
      },
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain('src="https://');
    expect(html).not.toContain('href="');
    expect(html).toContain(
      "&lt;script src=&quot;https://evil.example/a.js&quot;&gt;&amp; &#39;texto&#39;&lt;/script&gt;\n  segunda línea",
    );
    expect(html).toContain("white-space: pre-wrap");
  });

  test("incluye únicamente el logo incrustado y no usa la URI del perfil", () => {
    const withLogo = {
      ...business,
      logo: {
        uri: "https://external.example/logo.png",
        mimeType: "image/png" as const,
      },
    };
    expect(buildEstimatePdfHtml(estimate, withLogo, logoDataUri)).toContain(
      `src="${logoDataUri}"`,
    );
    expect(buildEstimatePdfHtml(estimate, withLogo)).not.toContain("<img");
    for (const invalidLogo of [
      "https://external.example/logo.png",
      'data:image/png;base64,abc" onerror="alert(1)',
      "data:image/svg+xml;base64,PHN2Zz4=",
      "data:text/html;base64,abc=",
    ]) {
      const html = buildEstimatePdfHtml(estimate, withLogo, invalidLogo);
      expect(html).not.toContain("<img");
      expect(html).not.toContain(withLogo.logo.uri);
    }
  });

  test("admite borradores sin ítems y omite los datos opcionales ausentes", () => {
    const html = buildEstimatePdfHtml(
      {
        ...estimate,
        items: [],
        validUntil: undefined,
        notes: undefined,
        customerSnapshot: { name: "Ana" },
      },
      { displayName: "Juan", updatedAt: business.updatedAt },
    );
    expect(html).toContain('class="draft">BORRADOR</div>');
    expect(html).toContain("Sin ítems cargados.");
    expect(html).toContain('class="numeric">$ 0,00</span>');
    expect(html).not.toContain("undefined");
    expect(html).not.toContain('<div class="address">');
    expect(html).not.toContain("<h2>Notas</h2>");
    expect(
      buildEstimatePdfHtml(
        { ...estimate, status: EstimateStatus.Sent },
        business,
      ),
    ).not.toContain("BORRADOR");
  });

  test("conserva todos los ítems de tablas largas y declara reglas de paginación", () => {
    const items = Array.from({ length: 100 }, (_, index) => ({
      ...estimate.items[0],
      id: `item-${index}`,
      description: `Concepto ${index} ${"palabra".repeat(40)}`,
    }));
    const html = buildEstimatePdfHtml({ ...estimate, items }, business);
    expect(html.match(/<tr class="item-row">/g)).toHaveLength(100);
    expect(html).toContain(items[99].description);
    expect(html).toContain("size: A4");
    expect(html).toContain("display: table-header-group");
    expect(html).toContain("page-break-inside: avoid");
    expect(html).toContain("overflow-wrap: anywhere");
    expect(html).not.toMatch(/<(?:script|link|iframe)\b/);
  });
});
