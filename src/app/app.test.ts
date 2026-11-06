import { render, screen, userEvent, fireEvent } from "@ng-native/testing";
import { expect, test, vi } from "vitest";
import { App } from "./app";
import { Dialogs, HardwareBack } from "@ng-native/device";
import * as notifications from "expo-notifications";
import { BackupService } from "./backup/services/backup.service";
import { buildBackup } from "./backup/models/backup-file";
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

test("el menú abre la copia de seguridad y vuelve a la pestaña anterior", async () => {
  const { user } = await setup();
  await user.press(screen.getByRole("button", { name: "Abrir menú" }));
  await user.press(screen.getByRole("button", { name: "Copia de seguridad" }));
  await vi.waitFor(() =>
    expect(screen.getByRole("button", { name: "Guardar copia" })).toBeTruthy(),
  );
  expect(screen.getByRole("button", { name: "Elegir archivo" })).toBeTruthy();
  expect(screen.queryByRole("tab", { name: "Clientes" })).toBeNull();
  await user.press(screen.getByRole("button", { name: "Volver" }));
  expect(screen.getByRole("tab", { name: "Clientes" })).toBeTruthy();
});

test("el menú abre la agenda, muestra el estado vacío y vuelve a Inicio", async () => {
  const { user } = await setup();
  expect(screen.getByText("No tenés visitas pendientes.")).toBeTruthy();
  await user.press(screen.getByRole("button", { name: "Abrir menú" }));
  await user.press(screen.getByRole("button", { name: "Agenda" }));
  await vi.waitFor(() =>
    expect(screen.getByRole("button", { name: "Agregar visita" })).toBeTruthy(),
  );
  expect(screen.getByText("Sin visitas pendientes")).toBeTruthy();
  expect(screen.queryByRole("tab", { name: "Clientes" })).toBeNull();
  await user.press(screen.getByRole("button", { name: "Volver" }));
  expect(screen.getByRole("tab", { name: "Clientes" })).toBeTruthy();
});

/** App con una visita guardada, Atrás de Android simulado y una restauración que el test controla. */
async function setupReminders() {
  const handlers: (() => boolean)[] = [];
  const visit = {
    id: "00000000-0000-4000-8000-0000000000aa",
    title: "Revisar instalación",
    kind: "visit",
    status: "pending",
    date: "2030-03-10",
    createdAt: "2026-11-06T10:00:00.000Z",
    updatedAt: "2026-11-06T10:00:00.000Z",
  };
  const restoreGate = Promise.withResolvers<void>();
  const backups = {
    share: vi.fn(),
    pick: vi.fn(async () => buildBackup({}, undefined)),
    restore: vi.fn(() => restoreGate.promise),
  };
  /** Guardados que el test retiene hasta soltarlos, por clave de almacenamiento. */
  const gates = new Map<string, PromiseWithResolvers<void>>();
  const confirm = vi.fn().mockResolvedValue(true);
  const storage = {
    read: vi.fn(async (key: string) => (key === "visits.v1" ? [visit] : null)),
    update: async <T>(key: string, change: (value: T | null) => T) => {
      await storage.write(key, change(null));
    },
    write: vi.fn(async (key: string, _value?: unknown) => {
      await gates.get(key)?.promise;
    }),
  };
  vi.mocked(notifications.addNotificationResponseReceivedListener).mockClear();
  await render(App, {
    providers: [
      { provide: LocalStorageService, useValue: storage },
      { provide: BackupService, useValue: backups },
      {
        provide: IdService,
        useValue: {
          create: async () => "00000000-0000-4000-8000-000000000098",
        },
      },
      {
        provide: Dialogs,
        useValue: { confirm },
      },
      {
        provide: HardwareBack,
        useValue: {
          handle: (handler: () => boolean) => {
            handlers.push(handler);
            return () => void handlers.splice(handlers.indexOf(handler), 1);
          },
        },
      },
    ],
  });
  await vi.waitFor(() =>
    expect(screen.queryByText("Cargando tu negocio…")).toBeNull(),
  );
  await vi.waitFor(() =>
    expect(
      notifications.addNotificationResponseReceivedListener,
    ).toHaveBeenCalled(),
  );
  const listener = vi
    .mocked(notifications.addNotificationResponseReceivedListener)
    .mock.calls.at(-1)![0];
  return {
    user: userEvent.setup(),
    gates,
    confirm,
    restoreGate,
    backups,
    /** El último handler registrado atiende primero, como el botón Atrás del sistema. */
    back: () => [...handlers].reverse().some((handler) => handler()),
    tapReminder: (id = visit.id) =>
      listener({
        notification: { request: { content: { data: { visitId: id } } } },
      } as never),
  };
}
/** Deja correr las promesas y temporizadores pendientes antes de afirmar que algo NO pasó. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 40));
const startRestore = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.press(screen.getByRole("button", { name: "Abrir menú" }));
  await user.press(screen.getByRole("button", { name: "Copia de seguridad" }));
  await user.press(screen.getByRole("button", { name: "Elegir archivo" }));
};

test("tocar un aviso con Ayuda visible muestra la visita y no deja Ayuda encima", async () => {
  const { user, tapReminder } = await setupReminders();
  await user.press(screen.getByRole("button", { name: "Abrir menú" }));
  await user.press(screen.getByRole("button", { name: "Ayuda" }));
  await vi.waitFor(() => expect(screen.getByText("Ayuda")).toBeTruthy());
  tapReminder();
  await vi.waitFor(() =>
    expect(screen.getByRole("button", { name: "Guardar visita" })).toBeTruthy(),
  );
  expect(screen.getByDisplayValue("Revisar instalación")).toBeTruthy();
  expect(screen.queryByText("Ayuda")).toBeNull();
});

test("Atrás mantiene Copia de seguridad mientras restaura y vuelve al terminar", async () => {
  const { user, restoreGate, backups, back } = await setupReminders();
  await startRestore(user);
  await vi.waitFor(() => expect(backups.restore).toHaveBeenCalled());
  expect(back()).toBe(true);
  expect(screen.getByRole("button", { name: "Guardar copia" })).toBeTruthy();
  restoreGate.resolve();
  await vi.waitFor(() =>
    expect(screen.queryByText("Copia restaurada.")).not.toBeNull(),
  );
  expect(back()).toBe(true);
  await vi.waitFor(() =>
    expect(screen.getByRole("tab", { name: "Clientes" })).toBeTruthy(),
  );
  expect(screen.queryByRole("button", { name: "Guardar copia" })).toBeNull();
});

test("un aviso tocado durante una restauración espera a que termine y luego abre la visita", async () => {
  const { user, restoreGate, backups, tapReminder } = await setupReminders();
  await startRestore(user);
  await vi.waitFor(() => expect(backups.restore).toHaveBeenCalled());
  tapReminder();
  await settle();
  expect(screen.queryByRole("button", { name: "Guardar visita" })).toBeNull();
  expect(screen.getByRole("button", { name: "Guardar copia" })).toBeTruthy();
  restoreGate.resolve();
  await vi.waitFor(() =>
    expect(screen.getByRole("button", { name: "Guardar visita" })).toBeTruthy(),
  );
  expect(screen.queryByRole("button", { name: "Guardar copia" })).toBeNull();
});

const holdSaves = (
  gates: Map<string, PromiseWithResolvers<void>>,
  key: string,
) => {
  const gate = Promise.withResolvers<void>();
  gates.set(key, gate);
  return gate;
};

test("un aviso tocado mientras Mi negocio guarda abre la visita cuando termina el guardado", async () => {
  const { user, gates, tapReminder } = await setupReminders();
  await user.press(screen.getByRole("button", { name: "Abrir menú" }));
  await user.press(screen.getByRole("button", { name: "Datos del negocio" }));
  await vi.waitFor(() =>
    expect(screen.getByLabelText("Nombre o nombre comercial *")).toBeTruthy(),
  );
  await fireEvent.changeText(
    screen.getByLabelText("Nombre o nombre comercial *"),
    "Electricidad Pedro",
  );
  const save = holdSaves(gates, "business-profile.v1");
  await user.press(
    screen.getByRole("button", { name: "Guardar datos del negocio" }),
  );
  tapReminder();
  await settle();
  expect(screen.queryByRole("button", { name: "Guardar visita" })).toBeNull();
  expect(screen.getByLabelText("Nombre o nombre comercial *")).toBeTruthy();
  save.resolve();
  await vi.waitFor(() =>
    expect(screen.getByRole("button", { name: "Guardar visita" })).toBeTruthy(),
  );
  expect(screen.getByDisplayValue("Revisar instalación")).toBeTruthy();
  expect(screen.queryByLabelText("Nombre o nombre comercial *")).toBeNull();
});

test("un aviso tocado mientras Agenda guarda abre la visita cuando termina el guardado", async () => {
  const { user, gates, tapReminder } = await setupReminders();
  await user.press(screen.getByRole("button", { name: "Abrir menú" }));
  await user.press(screen.getByRole("button", { name: "Agenda" }));
  await user.press(
    await screen.findByRole("button", { name: "Agregar visita" }),
  );
  await fireEvent.changeText(screen.getByLabelText("Título"), "Otra visita");
  const save = holdSaves(gates, "visits.v1");
  await user.press(screen.getByRole("button", { name: "Guardar visita" }));
  tapReminder();
  await settle();
  expect(screen.queryByDisplayValue("Revisar instalación")).toBeNull();
  save.resolve();
  await vi.waitFor(() =>
    expect(screen.getByDisplayValue("Revisar instalación")).toBeTruthy(),
  );
});

test("si el usuario elige seguir editando Mi negocio, el aviso no cambia la pantalla", async () => {
  const { user, confirm, tapReminder } = await setupReminders();
  await user.press(screen.getByRole("button", { name: "Abrir menú" }));
  await user.press(screen.getByRole("button", { name: "Datos del negocio" }));
  await vi.waitFor(() =>
    expect(screen.getByLabelText("Nombre o nombre comercial *")).toBeTruthy(),
  );
  await fireEvent.changeText(
    screen.getByLabelText("Nombre o nombre comercial *"),
    "Sin guardar",
  );
  confirm.mockResolvedValueOnce(false);
  tapReminder();
  await vi.waitFor(() => expect(confirm).toHaveBeenCalled());
  await settle();
  expect(screen.getByDisplayValue("Sin guardar")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Guardar visita" })).toBeNull();
});

test("un aviso tocado con una dirección sin confirmar espera y no pierde la calle escrita", async () => {
  const { user, tapReminder } = await setupReminders();
  await user.press(screen.getByRole("tab", { name: "Clientes" }));
  await vi.waitFor(() =>
    expect(screen.queryByText("Cargando clientes…")).toBeNull(),
  );
  await user.press(screen.getByRole("button", { name: "Agregar cliente" }));
  await user.press(screen.getByRole("button", { name: "Agregar dirección" }));
  await fireEvent.changeText(
    screen.getByLabelText("Nombre de dirección *"),
    "Casa",
  );
  await fireEvent.changeText(screen.getByLabelText("Calle"), "San Martín");
  tapReminder();
  await settle();
  expect(screen.queryByRole("button", { name: "Guardar visita" })).toBeNull();
  expect(screen.getByDisplayValue("San Martín")).toBeTruthy();
  await user.press(screen.getByRole("button", { name: "Guardar dirección" }));
  await vi.waitFor(() =>
    expect(screen.getByRole("button", { name: "Guardar visita" })).toBeTruthy(),
  );
});

test("dos avisos seguidos mientras se confirma el descarte de Mi negocio no apilan confirmaciones", async () => {
  const { user, confirm, tapReminder } = await setupReminders();
  await user.press(screen.getByRole("button", { name: "Abrir menú" }));
  await user.press(screen.getByRole("button", { name: "Datos del negocio" }));
  await vi.waitFor(() =>
    expect(screen.getByLabelText("Nombre o nombre comercial *")).toBeTruthy(),
  );
  await fireEvent.changeText(
    screen.getByLabelText("Nombre o nombre comercial *"),
    "Sin guardar",
  );
  const answer = Promise.withResolvers<boolean>();
  confirm.mockImplementationOnce(() => answer.promise);
  tapReminder();
  await vi.waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
  tapReminder();
  await settle();
  expect(confirm).toHaveBeenCalledTimes(1);
  answer.resolve(true);
  await vi.waitFor(() =>
    expect(screen.getByRole("button", { name: "Guardar visita" })).toBeTruthy(),
  );
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(screen.getByDisplayValue("Revisar instalación")).toBeTruthy();
});

test("dos toques del mismo aviso con Seguir editando muestran una sola confirmación y conservan el formulario", async () => {
  const { user, confirm, tapReminder } = await setupReminders();
  await user.press(screen.getByRole("button", { name: "Abrir menú" }));
  await user.press(screen.getByRole("button", { name: "Datos del negocio" }));
  await vi.waitFor(() =>
    expect(screen.getByLabelText("Nombre o nombre comercial *")).toBeTruthy(),
  );
  await fireEvent.changeText(
    screen.getByLabelText("Nombre o nombre comercial *"),
    "Sin guardar",
  );
  const answer = Promise.withResolvers<boolean>();
  confirm.mockImplementationOnce(() => answer.promise);
  tapReminder();
  await vi.waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
  tapReminder();
  answer.resolve(false);
  await settle();
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(screen.getByDisplayValue("Sin guardar")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Guardar visita" })).toBeNull();
});

test("un aviso de otra visita tocado durante la confirmación sigue pidiendo su propia confirmación", async () => {
  const { user, confirm, tapReminder } = await setupReminders();
  await user.press(screen.getByRole("button", { name: "Abrir menú" }));
  await user.press(screen.getByRole("button", { name: "Datos del negocio" }));
  await vi.waitFor(() =>
    expect(screen.getByLabelText("Nombre o nombre comercial *")).toBeTruthy(),
  );
  await fireEvent.changeText(
    screen.getByLabelText("Nombre o nombre comercial *"),
    "Sin guardar",
  );
  const answer = Promise.withResolvers<boolean>();
  confirm.mockImplementationOnce(() => answer.promise);
  confirm.mockResolvedValueOnce(false);
  tapReminder();
  await vi.waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
  tapReminder("00000000-0000-4000-8000-0000000000bb");
  answer.resolve(false);
  await vi.waitFor(() => expect(confirm).toHaveBeenCalledTimes(2));
  await settle();
  expect(screen.getByDisplayValue("Sin guardar")).toBeTruthy();
});
