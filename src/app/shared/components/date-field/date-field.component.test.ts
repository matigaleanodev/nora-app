import { render, screen, userEvent } from "@ng-native/testing";
import { expect, test, vi } from "vitest";
import { DateFieldComponent } from "./date-field.component";
import { DatePickerService } from "../../services/date-picker.service";

test("muestra día mes año y emite el string del calendario sin conversión UTC", async () => {
  const valueChange = vi.fn();
  const pick = vi.fn().mockResolvedValue("2026-10-15");
  await render(DateFieldComponent, {
    inputs: { label: "Válido hasta", value: "2026-10-14" },
    providers: [{ provide: DatePickerService, useValue: { pick } }],
    on: { valueChange },
  });
  expect(screen.getByText("14/10/2026")).toBeTruthy();
  await userEvent.press(screen.getByRole("button", { name: "Válido hasta" }));
  expect(pick).toHaveBeenCalledWith("2026-10-14");
  expect(valueChange).toHaveBeenCalledWith("2026-10-15");
});
test("cancelar el calendario conserva la fecha y quitarla emite un valor vacío", async () => {
  const valueChange = vi.fn();
  const pick = vi.fn().mockResolvedValue(null);
  await render(DateFieldComponent, {
    inputs: { label: "Válido hasta", value: "2026-10-15" },
    providers: [
      {
        provide: DatePickerService,
        useValue: { pick },
      },
    ],
    on: { valueChange },
  });
  await userEvent.press(screen.getByRole("button", { name: "Válido hasta" }));
  expect(valueChange).not.toHaveBeenCalled();
  await userEvent.press(screen.getByRole("button", { name: "Quitar fecha" }));
  expect(valueChange).toHaveBeenCalledWith("");
  expect(pick).toHaveBeenCalledTimes(1);
});
