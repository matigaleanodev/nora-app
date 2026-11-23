import { Currency } from "../../estimates/models/estimate.model";

const integerFormat = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

function decimalCents(cents: number, groupThousands: boolean): string {
  const absolute = Math.abs(cents);
  const fraction = absolute % 100;
  const units = (absolute - fraction) / 100;
  const whole = groupThousands ? integerFormat.format(units) : String(units);
  const sign = cents < 0 ? "-" : "";
  return `${sign}${whole},${String(fraction).padStart(2, "0")}`;
}

export function formatMoneyInput(cents: number): string {
  return decimalCents(cents, false);
}

export function formatMoney(cents: number, currency: Currency): string {
  return `${currency === Currency.USD ? "US$" : "$"} ${decimalCents(cents, true)}`;
}
