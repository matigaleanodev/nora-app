import { expect, test } from "vitest";
import { parseMoneyInput, parseQuantityInput } from "./decimal-input";
import { formatMoneyInput } from "./money-format";
test.each([
  ["10,25", 1025],
  ["10.25", 1025],
  ["0,01", 1],
  ["1", 100],
  [" 10,2 ", 1020],
])("convierte %s a %s centavos sin errores binarios", (text, cents) =>
  expect(parseMoneyInput(text)).toBe(cents),
);
test.each([
  [Number.MAX_SAFE_INTEGER - 1, "90071992547409,90"],
  [Number.MAX_SAFE_INTEGER, "90071992547409,91"],
])(
  "editar el precio de %i centavos conserva el valor exacto",
  (cents, value) => {
    expect(formatMoneyInput(cents)).toBe(value);
    expect(parseMoneyInput(value)).toBe(cents);
  },
);
test.each([
  "",
  "-1",
  "1.250,50",
  "1,250.50",
  "1.005",
  "Infinity",
  "1e3",
  "9007199254740992",
])("rechaza el importe inválido o ambiguo %s", (text) =>
  expect(() => parseMoneyInput(text)).toThrow(),
);
test("admite cantidades de tres decimales y rechaza cantidades fuera de rango", () => {
  expect(parseQuantityInput("1,005")).toBe(1.005);
  expect(() => parseQuantityInput("1,0001")).toThrow();
  expect(() => parseQuantityInput("0")).toThrow();
  expect(() => parseQuantityInput("1000001")).toThrow();
});
