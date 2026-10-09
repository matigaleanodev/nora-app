import { render, screen, userEvent } from "@ng-native/testing";
import { expect, test, vi } from "vitest";
import { ActionButtonComponent } from "./action-button.component";
test("emite una acción accesible y bloquea pulsaciones cuando está deshabilitado", async () => {
  const pressed = vi.fn();
  const result = await render(ActionButtonComponent, {
    inputs: { text: "Guardar", label: "Guardar cliente", variant: "primary" },
    on: { pressed },
  });
  await userEvent.press(
    screen.getByRole("button", { name: "Guardar cliente" }),
  );
  expect(pressed).toHaveBeenCalledTimes(1);
  await result.rerender({ inputs: { disabled: true } });
  await userEvent.press(
    screen.getByRole("button", { name: "Guardar cliente" }),
  );
  expect(pressed).toHaveBeenCalledTimes(1);
});
