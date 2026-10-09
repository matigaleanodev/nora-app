/** Convierte un importe sin separadores de miles a centavos, sin redondear la entrada. */
export function parseMoneyInput(value: string): number {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim()))
    throw new Error(
      "Ingresá un precio válido con hasta dos decimales, sin separadores de miles.",
    );
  const [whole, decimals = ""] = value.trim().split(/[.,]/);
  const cents = Number(whole) * 100 + Number(decimals.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) throw new Error("Precio fuera de rango.");
  return cents;
}
export function parseQuantityInput(value: string): number {
  if (!/^\d+(?:[.,]\d{1,3})?$/.test(value.trim()))
    throw new Error("Ingresá una cantidad con hasta tres decimales.");
  const quantity = Number(value.trim().replace(",", "."));
  if (quantity <= 0 || quantity > 1_000_000)
    throw new Error(
      "La cantidad debe ser mayor a cero y no superar 1.000.000.",
    );
  return quantity;
}
