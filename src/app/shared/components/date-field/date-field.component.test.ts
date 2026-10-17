import { render, screen, userEvent, fireEvent } from "@ng-native/testing";
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

test("bloquea la fecha y su borrado mientras abre el calendario, y los libera al cerrar", async () => {
  let close!: (value: string | null) => void;
  const pick = vi.fn().mockImplementation(
    () =>
      new Promise<string | null>((resolve) => {
        close = resolve;
      }),
  );
  const valueChange = vi.fn();
  const result = await render(DateFieldComponent, {
    inputs: { label: "Válido hasta", value: "2026-10-17" },
    providers: [{ provide: DatePickerService, useValue: { pick } }],
    on: { valueChange },
  });
  const field = screen.getByRole("button", { name: "Válido hasta" });
  await fireEvent.press(field);
  await fireEvent.press(field);
  expect(pick).toHaveBeenCalledOnce();
  await userEvent.press(screen.getByRole("button", { name: "Quitar fecha" }));
  expect(valueChange).not.toHaveBeenCalled();
  close(null);
  await result.detectChanges();
  await userEvent.press(screen.getByRole("button", { name: "Quitar fecha" }));
  expect(valueChange).toHaveBeenCalledWith("");
});
