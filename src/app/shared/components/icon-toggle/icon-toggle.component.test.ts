import { render, screen, userEvent } from "@ng-native/testing";
import { expect, test, vi } from "vitest";
import { IconToggleComponent } from "./icon-toggle.component";

test("expone el estado accesible y permite marcar y desmarcar WhatsApp", async () => {
  const checkedChange = vi.fn();
  const result = await render(IconToggleComponent, {
    inputs: { label: "Tiene WhatsApp", checked: false },
    on: { checkedChange },
  });
  await userEvent.press(
    screen.getByRole("checkbox", { name: "Tiene WhatsApp" }),
  );
  expect(checkedChange).toHaveBeenLastCalledWith(true);
  await result.rerender({ inputs: { checked: true } });
  await userEvent.press(
    screen.getByRole("checkbox", { name: "Tiene WhatsApp" }),
  );
  expect(checkedChange).toHaveBeenLastCalledWith(false);
});
test("no cambia el estado mientras el control está deshabilitado", async () => {
  const checkedChange = vi.fn();
  await render(IconToggleComponent, {
    inputs: { label: "Tiene WhatsApp", checked: true, disabled: true },
    on: { checkedChange },
  });
  await userEvent.press(
    screen.getByRole("checkbox", { name: "Tiene WhatsApp" }),
  );
  expect(checkedChange).not.toHaveBeenCalled();
});
