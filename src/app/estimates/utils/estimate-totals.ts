import type { EstimateItemInput } from "../models/estimate.model";
/**
 * Devuelve centavos enteros, redondeando mitades hacia arriba por ítem.
 * Rechaza precios negativos, cantidades de más de tres decimales e importes fuera de rango.
 */
export function calculateItemSubtotal(item: EstimateItemInput): number {
  if (
    !Number.isFinite(item.quantity) ||
    item.quantity <= 0 ||
    item.quantity > 1_000_000 ||
    !Number.isSafeInteger(item.unitPriceCents) ||
    item.unitPriceCents < 0
  ) {
    throw new Error("Cantidad o precio inválido.");
  }
  // Convierte la cantidad a milésimas para calcular con enteros y evitar errores de coma flotante.
  const thousandths = Math.round(item.quantity * 1000);
  if (Math.abs(thousandths / 1000 - item.quantity) > 1e-9)
    throw new Error("La cantidad admite hasta tres decimales.");
  const product = BigInt(thousandths) * BigInt(item.unitPriceCents);
  const cents = Number((product + 500n) / 1000n);
  if (!Number.isSafeInteger(cents)) throw new Error("Importe fuera de rango.");
  return cents;
}
/** Suma subtotales ya redondeados; no vuelve a redondear el total ni convierte monedas. */
export function calculateEstimateTotal(
  items: readonly EstimateItemInput[],
): number {
  const total = items.reduce(
    (sum, item) => sum + calculateItemSubtotal(item),
    0,
  );
  if (!Number.isSafeInteger(total)) throw new Error("Total fuera de rango.");
  return total;
}
