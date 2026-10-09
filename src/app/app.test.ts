import { render, screen, userEvent, fireEvent } from "@ng-native/testing";
import { expect, test, vi } from "vitest";
import { App } from "./app";
import { Dialogs } from "@ng-native/device";
import { CustomersPageService } from "./customers/services/customers-page.service";
import { IdService } from "./shared/services/id.service";
import { LocalStorageService } from "./core/storage/local-storage.service";

async function setup(failWrite = false) {
  const storage = {
    read: vi.fn().mockResolvedValue(null),
    write: failWrite
      ? vi.fn().mockRejectedValue(new Error("disk unavailable"))
      : vi.fn().mockResolvedValue(undefined),
  };
  await render(App, {
    providers: [{ provide: LocalStorageService, useValue: storage }],
  });
  await vi.waitFor(() =>
    expect(screen.queryByText("Cargando pendientes…")).toBeNull(),
  );
  return { storage, user: userEvent.setup() };
}

test("inicia en Inicio y permite navegar entre las tres pestañas", async () => {
  const { user } = await setup();
  expect(screen.getByText("Próximos pasos")).toBeTruthy();
  await user.press(screen.getByRole("tab", { name: "Clientes" }));
  await vi.waitFor(() =>
    expect(screen.getByText("Todavía no hay clientes acá.")).toBeTruthy(),
  );
  await user.press(screen.getByRole("tab", { name: "Presupuestos" }));
  await vi.waitFor(() =>
    expect(
      screen.getByText("Tus próximos trabajos empiezan acá."),
    ).toBeTruthy(),
  );
  await user.press(screen.getByRole("tab", { name: "Inicio" }));
  expect(screen.getByText("Próximos pasos")).toBeTruthy();
});

test("guarda las tareas completadas y actualiza el contador de pendientes", async () => {
  const { user, storage } = await setup();
  await user.press(
    screen.getByRole("checkbox", { name: "Preparar presupuesto" }),
  );
  await vi.waitFor(() => expect(screen.getByText("2")).toBeTruthy());
  expect(screen.getByText("Tarea completada.")).toBeTruthy();
  await user.press(screen.getByRole("button", { name: "Cerrar notificación" }));
  await vi.waitFor(
    () => expect(screen.queryByText("Tarea completada.")).toBeNull(),
    { timeout: 4500 },
  );
  expect(storage.write).toHaveBeenCalledWith(
    "preview.tasks.v1",
    expect.arrayContaining([
      expect.objectContaining({ id: "estimate", done: true }),
    ]),
  );
});

test("conserva la tarea pendiente cuando falla el guardado", async () => {
  const { user } = await setup(true);
  await user.press(
    screen.getByRole("checkbox", { name: "Preparar presupuesto" }),
  );
  await vi.waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  expect(screen.getByText("3")).toBeTruthy();
});

test("conecta los CRUD reales al storage y conserva formularios al cambiar de pestaña", async () => {
  const records = new Map<string, unknown>();
  const storage = new LocalStorageService();
  vi.spyOn(storage, "read").mockImplementation(
    async <T>(key: string) =>
      structuredClone(records.get(key) ?? null) as T | null,
  );
  vi.spyOn(storage, "write").mockImplementation(
    async <T>(key: string, value: T) => {
      records.set(key, structuredClone(value));
    },
  );
  let nextId = 0;
  const result = await render(App, {
    providers: [
      { provide: LocalStorageService, useValue: storage },
      {
        provide: IdService,
        useValue: {
          create: async () =>
            `00000000-0000-4000-8000-${String(++nextId).padStart(12, "0")}`,
        },
      },
      {
        provide: Dialogs,
        useValue: { confirm: vi.fn().mockResolvedValue(true) },
      },
    ],
  });
  const user = userEvent.setup();
  await user.press(screen.getByRole("tab", { name: "Clientes" }));
  await vi.waitFor(() =>
    expect(screen.queryByText("Cargando clientes…")).toBeNull(),
  );
  await user.press(screen.getByRole("button", { name: "Agregar cliente" }));
  await fireEvent.changeText(screen.getByLabelText("Nombre *"), "Cliente real");
  await user.press(screen.getByRole("tab", { name: "Inicio" }));
  await user.press(screen.getByRole("tab", { name: "Clientes" }));
  expect(screen.getByDisplayValue("Cliente real")).toBeTruthy();
  await vi.waitFor(() =>
    expect(
      result.componentRef.injector.get(CustomersPageService).loading(),
    ).toBe(false),
  );
  await result.detectChanges();
  await user.press(screen.getByRole("button", { name: "Guardar cliente" }));
  await vi.waitFor(() =>
    expect(screen.getByText("Detalle del cliente")).toBeTruthy(),
  );
  expect(records.get("customers.v1")).toEqual([
    expect.objectContaining({ name: "Cliente real" }),
  ]);
  await user.press(screen.getByRole("tab", { name: "Presupuestos" }));
  await vi.waitFor(() =>
    expect(screen.queryByText("Cargando presupuestos…")).toBeNull(),
  );
  await user.press(screen.getByRole("button", { name: "Agregar presupuesto" }));
  await fireEvent.changeText(
    screen.getByLabelText("Número de presupuesto *"),
    "P-100",
  );
  await user.press(screen.getByRole("button", { name: "Elegir cliente" }));
  await user.press(
    screen.getByRole("button", { name: "Seleccionar cliente Cliente real" }),
  );
  await fireEvent.changeText(
    screen.getByLabelText("Descripción del trabajo *"),
    "Reparación",
  );
  await user.press(screen.getByRole("button", { name: "Agregar ítem" }));
  await fireEvent.changeText(
    screen.getByLabelText("Descripción del ítem 1"),
    "Materiales",
  );
  await fireEvent.changeText(
    screen.getByLabelText("Precio unitario del ítem 1"),
    "1250,50",
  );
  await user.press(screen.getByRole("button", { name: "Guardar presupuesto" }));
  await vi.waitFor(() =>
    expect(screen.getByText("Detalle del presupuesto")).toBeTruthy(),
  );
  expect(records.get("estimates.v1")).toEqual([
    expect.objectContaining({
      number: "P-100",
      items: [expect.objectContaining({ unitPriceCents: 125050 })],
    }),
  ]);
  await user.press(screen.getByRole("button", { name: "Eliminar borrador" }));
  expect(records.get("estimates.v1")).toEqual([]);
});
