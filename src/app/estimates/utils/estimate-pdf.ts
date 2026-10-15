import type { BusinessProfile } from "../../business/models/business-profile.model";
import { formatCustomerPhone } from "../../customers/models/customer.model";
import { formatCalendarDate } from "../../shared/utils/calendar-date";
import {
  Currency,
  EstimateItemType,
  EstimateStatus,
  MeasurementUnit,
  type Estimate,
} from "../models/estimate.model";
import {
  calculateEstimateTotal,
  calculateItemSubtotal,
} from "./estimate-totals";

const unitLabels: Record<MeasurementUnit, string> = {
  [MeasurementUnit.Meter]: "m",
  [MeasurementUnit.SquareMeter]: "m²",
  [MeasurementUnit.CubicMeter]: "m³",
  [MeasurementUnit.Liter]: "Litros",
  [MeasurementUnit.Unit]: "Unidades",
  [MeasurementUnit.Hour]: "Horas",
  [MeasurementUnit.Job]: "Trabajo",
};
const moneyFormatter = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const quantityFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 3,
});

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function formatMoney(cents: number, currency: Currency): string {
  return `${currency === Currency.USD ? "US$" : "$"} ${moneyFormatter.format(cents / 100)}`;
}

function contactHtml(
  contact: BusinessProfile | Estimate["customerSnapshot"],
): string {
  return [
    contact.phone ? formatCustomerPhone(contact.phone) : undefined,
    contact.email,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => `<div class="contact">${escapeHtml(value)}</div>`)
    .join("");
}

/** Genera un documento autónomo: los datos se escapan y el logo nunca se descarga de una URL. */
export function buildEstimatePdfHtml(
  estimate: Estimate,
  business: BusinessProfile,
  logoDataUri?: string,
): string {
  const customer = estimate.customerSnapshot;
  const address = customer.address;
  const validUntil = estimate.validUntil
    ? formatCalendarDate(estimate.validUntil)
    : "";
  const addressHtml = address
    ? `<div class="address">
        <strong>${escapeHtml(address.name)}</strong>
        <div>${escapeHtml(`${address.street} ${address.streetNumber}`)}</div>
        ${address.floor ? `<div>Piso ${escapeHtml(address.floor)}</div>` : ""}
        ${address.apartment ? `<div>Departamento ${escapeHtml(address.apartment)}</div>` : ""}
        <div>${escapeHtml(`${address.city}, ${address.province}`)}</div>
      </div>`
    : "";
  // Sólo se admiten imágenes locales incrustadas; SVG y URLs permitirían cargar recursos externos.
  const logoHtml =
    logoDataUri &&
    /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
      logoDataUri,
    )
      ? `<img class="logo" src="${logoDataUri}" alt="Logo del negocio" />`
      : "";
  const rows = estimate.items
    .map(
      (item) => `<tr class="item-row">
        <td><div class="item-type">${item.type === EstimateItemType.Material ? "Material" : "Mano de obra"}</div><div class="line-text">${escapeHtml(item.description)}</div></td>
        <td class="numeric">${quantityFormatter.format(item.quantity)}</td>
        <td>${unitLabels[item.unit]}</td>
        <td class="numeric">${formatMoney(item.unitPriceCents, estimate.currency)}</td>
        <td class="numeric">${formatMoney(calculateItemSubtotal(item), estimate.currency)}</td>
      </tr>`,
    )
    .join("");
  const total = calculateEstimateTotal(estimate.items);
  return `<!doctype html>
<html lang="es-AR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Presupuesto ${escapeHtml(estimate.number)}</title>
  <style>
    @page { size: A4; margin: 16mm 14mm 18mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #292c25; font: 11px/1.5 Arial, sans-serif; }
    h1, h2, p { margin: 0; }
    h1 { color: #a74f35; font-size: 26px; line-height: 1.2; }
    h2 { color: #606b43; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; padding-bottom: 18px; border-bottom: 3px solid #a74f35; }
    .business { flex: 1; min-width: 0; }
    .business-name { font-size: 19px; font-weight: bold; margin: 6px 0; }
    .logo { max-width: 140px; max-height: 75px; object-fit: contain; }
    .document { width: 215px; text-align: right; }
    .document-number { font-size: 14px; margin-top: 8px; }
    .draft { display: inline-block; margin-top: 10px; padding: 3px 9px; border: 1px solid #b58935; color: #78571b; border-radius: 4px; font-size: 10px; letter-spacing: 1px; }
    .validity { margin-top: 10px; }
    .section { margin-top: 20px; }
    .customer-name { font-size: 15px; font-weight: bold; }
    .contact { color: #565b50; }
    .address { margin-top: 8px; }
    .line-text { white-space: pre-wrap; }
    div, p, td, th { overflow-wrap: anywhere; word-wrap: break-word; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 8px; }
    thead { display: table-header-group; }
    th { color: #fff; background: #606b43; text-align: left; font-size: 10px; padding: 9px 7px; }
    td { padding: 10px 7px; vertical-align: top; border-bottom: 1px solid #e1e3db; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    .numeric { text-align: right; font-variant-numeric: tabular-nums; }
    .item-type { color: #606b43; font-size: 9px; margin-bottom: 3px; }
    .empty { color: #565b50; padding: 16px 7px; }
    .total { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-top: 16px; padding: 13px 15px; background: #f4ebe4; border-left: 4px solid #a74f35; font-size: 16px; font-weight: bold; break-inside: avoid; page-break-inside: avoid; }
    .total-label { flex-shrink: 0; }
    .footer { margin-top: 26px; padding-top: 10px; border-top: 1px solid #e1e3db; color: #707566; font-size: 9px; }
  </style>
</head>
<body>
  <header class="header">
    <div class="business">${logoHtml}<div class="business-name line-text">${escapeHtml(business.displayName)}</div>${contactHtml(business)}</div>
    <div class="document">
      <h1>Presupuesto</h1>
      <div class="document-number line-text">${escapeHtml(estimate.number)}</div>
      ${estimate.status === EstimateStatus.Draft ? '<div class="draft">BORRADOR</div>' : ""}
      ${validUntil ? `<div class="validity">Válido hasta <strong>${validUntil}</strong></div>` : ""}
    </div>
  </header>
  <section class="section">
    <h2>Cliente</h2>
    <div class="customer-name line-text">${escapeHtml(customer.name)}</div>
    ${contactHtml(customer)}${addressHtml}
  </section>
  <section class="section">
    <h2>Descripción del trabajo</h2>
    <p class="line-text">${escapeHtml(estimate.description)}</p>
  </section>
  <section class="section">
    <h2>Materiales y mano de obra</h2>
    <table>
      <colgroup><col style="width:37%" /><col style="width:10%" /><col style="width:12%" /><col style="width:20%" /><col style="width:21%" /></colgroup>
      <thead><tr><th>Concepto</th><th class="numeric">Cantidad</th><th>Unidad</th><th class="numeric">Precio unitario</th><th class="numeric">Parcial</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" class="empty">Sin ítems cargados.</td></tr>'}</tbody>
    </table>
    <div class="total"><span class="total-label">Total ${escapeHtml(estimate.currency)}</span><span class="numeric">${formatMoney(total, estimate.currency)}</span></div>
  </section>
  ${estimate.notes ? `<section class="section"><h2>Notas</h2><p class="line-text">${escapeHtml(estimate.notes)}</p></section>` : ""}
  <footer class="footer">Presupuesto preparado con Nora.</footer>
</body>
</html>`;
}
