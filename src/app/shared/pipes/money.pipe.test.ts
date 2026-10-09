import { expect, test } from "vitest";
import { MoneyPipe } from "./money.pipe";
import { Currency } from "../../estimates/models/estimate.model";
test("muestra centavos como pesos con separadores argentinos", () => {
  expect(new MoneyPipe().transform(125050, Currency.ARS)).toBe("$ 1.250,50");
});
test("distingue dólares de pesos y conserva dos decimales incluso para cero", () => {
  const pipe = new MoneyPipe();
  expect(pipe.transform(0, Currency.USD)).toBe("US$ 0,00");
  expect(pipe.transform(1, Currency.USD)).toBe("US$ 0,01");
});
