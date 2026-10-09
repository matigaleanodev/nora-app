import { render, screen, userEvent } from "@ng-native/testing";
import { expect, test, vi } from "vitest";
import { FabComponent } from "./fab.component";
test("expone el nombre accesible y delega la acción de agregar", async () => {
  const pressed = vi.fn();
  await render(FabComponent, {
    inputs: { label: "Agregar cliente" },
    on: { pressed },
  });
  await userEvent.press(
    screen.getByRole("button", { name: "Agregar cliente" }),
  );
  expect(pressed).toHaveBeenCalledOnce();
});
