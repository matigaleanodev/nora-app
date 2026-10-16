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
    update: async <T>(key: string, change: (value: T | null) => T) => {
      await storage.write(key, change(null));
    },
    write: failWrite
      ? vi.fn().mockRejectedValue(new Error("disk unavailable"))
      : vi.fn().mockResolvedValue(undefined),
  };
  await render(App, {
    providers: [
      { provide: LocalStorageService, useValue: storage },
      {
        provide: IdService,
        useValue: {
          create: async () => "00000000-0000-4000-8000-000000000098",
        },
      },
    ],
  });
  await vi.waitFor(() =>
    expect(screen.queryByText("Cargando tu negocio…")).toBeNull(),
  );
  return { storage, user: userEvent.setup() };
}

test("inicia en Inicio y permite navegar entre las tres pestañas", async () => {
  const { user } = await setup();
  await vi.waitFor(() =>
    expect(screen.getByText("Tus presupuestos")).toBeTruthy(),
  );
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
  await vi.waitFor(() =>
    expect(screen.getByText("Tus presupuestos")).toBeTruthy(),
  );
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
  expect(screen.queryByRole("tab", { name: "Inicio" })).toBeNull();
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
  await user.press(screen.getByRole("button", { name: "Volver a clientes" }));
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
  await user.press(screen.getByRole("button", { name: "Agregar material" }));
  await fireEvent.changeText(screen.getByLabelText("Material *"), "Materiales");
  await fireEvent.changeText(
    screen.getByLabelText("Precio por unidad *"),
    "1250,50",
  );
  await user.press(screen.getByRole("button", { name: "Agregar" }));
  await user.press(screen.getByRole("button", { name: "Revisar presupuesto" }));
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

test("el menú abre el perfil y guarda los datos del negocio", async () => {
  const { user, storage } = await setup();
  await user.press(screen.getByRole("tab", { name: "Clientes" }));
  await vi.waitFor(() =>
    expect(screen.queryByText("Cargando clientes…")).toBeNull(),
  );
  await user.press(screen.getByRole("button", { name: "Agregar cliente" }));
  await fireEvent.changeText(
    screen.getByLabelText("Nombre *"),
    "Cliente pendiente",
  );
  await user.press(screen.getByRole("button", { name: "Guardar cliente" }));
  await vi.waitFor(() =>
    expect(screen.getByText("Detalle del cliente")).toBeTruthy(),
  );
  await user.press(screen.getByRole("button", { name: "Volver a clientes" }));
  await user.press(screen.getByRole("button", { name: "Abrir menú" }));
  await user.press(screen.getByRole("button", { name: "Datos del negocio" }));
  await vi.waitFor(() =>
    expect(screen.queryByText("Cargando tus datos…")).toBeNull(),
  );
  await fireEvent.changeText(
    screen.getByLabelText("Nombre o nombre comercial *"),
    "Electricidad Juan",
  );
  await user.press(
    screen.getByRole("button", { name: "Guardar datos del negocio" }),
  );
  expect(storage.write).toHaveBeenCalledWith(
    "business-profile.v1",
    expect.objectContaining({ displayName: "Electricidad Juan" }),
  );
  await user.press(
    screen.getByRole("button", { name: "Volver desde Mi negocio" }),
  );
  expect(screen.getByRole("tab", { name: "Clientes" })).toBeTruthy();
});
