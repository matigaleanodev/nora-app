import { render, screen, userEvent } from "@ng-native/testing";
import { expect, test, vi } from "vitest";
import { PageLayoutComponent } from "./page-layout.component";
test("muestra título y error y delega la acción de volver", async () => {
  const back = vi.fn();
  await render(PageLayoutComponent, {
    inputs: {
      title: "Detalle",
      eyebrow: "CLIENTES",
      backLabel: "Volver a clientes",
      error: "No se pudo guardar",
    },
    on: { back },
  });
  expect(screen.getByText("Detalle")).toBeTruthy();
  expect(screen.getByText("No se pudo guardar")).toBeTruthy();
  await userEvent.press(
    screen.getByRole("button", { name: "Volver a clientes" }),
  );
  expect(back).toHaveBeenCalledOnce();
});
test("reinicia el desplazamiento al cambiar de vista, pero no por cambios de texto", async () => {
  const result = await render(PageLayoutComponent, {
    inputs: { title: "Lista", resetKey: "list" },
  });
  const initialCommands = result.fabric.commands.length;
  await result.rerender({ inputs: { title: "Lista actualizada" } });
  expect(result.fabric.commands.length).toBe(initialCommands);
  await result.rerender({ inputs: { resetKey: "detail" } });
  expect(result.fabric.commands.length).toBeGreaterThan(initialCommands);
  expect(result.fabric.commands.at(-1)).toMatchObject({
    name: "scrollTo",
    args: [0, 0, false],
  });
});
