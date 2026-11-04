import { Injector } from "@angular/core";
import * as notifications from "expo-notifications";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { VisitKind, VisitStatus, type Visit } from "../models/visit.model";
import { reminderTime, VisitRemindersService } from "./visit-reminders.service";
import { VisitsService } from "./visits.service";

const nextYear = new Date().getFullYear() + 1;
const visit = (overrides: Partial<Visit> = {}): Visit => ({
  id: "6f1c2f4e-2b1a-4c58-9d0e-1a2b3c4d5e6f",
  title: "Revisar instalación",
  kind: VisitKind.Visit,
  status: VisitStatus.Pending,
  date: `${nextYear}-03-10`,
  time: "09:30",
  customerName: "Ana",
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
  ...overrides,
});
const other = (overrides: Partial<Visit> = {}) =>
  visit({ id: "11111111-1111-4111-8111-111111111111", ...overrides });

/** Estado nativo simulado: una notificación programada por identificador, como en Android. */
type Stored = {
  identifier: string;
  content: { title: string; body: string; data: { visitId: string } };
  trigger: { type: string; value: number };
};
const scheduled = new Map<string, Stored>();
const stale = (
  id: string,
  title = "Revisar instalación",
  body = "",
): Stored => ({
  identifier: id,
  content: { title, body, data: { visitId: id } },
  trigger: { type: "date", value: new Date(2020, 0, 1).getTime() },
});
const when = (id: string) => new Date(scheduled.get(id)!.trigger.value);
const gate = { release: undefined as undefined | (() => void) };
const store: { visits: readonly Visit[] } = { visits: [] };
const setReminders = vi.fn();

function setup() {
  const injector = Injector.create({
    providers: [
      VisitRemindersService,
      {
        provide: VisitsService,
        useValue: {
          getAll: async () => store.visits,
          setReminders,
        },
      },
    ],
  });
  return injector.get(VisitRemindersService);
}
const ids = () => [...scheduled.keys()].sort();

beforeEach(() => {
  vi.clearAllMocks();
  scheduled.clear();
  gate.release = undefined;
  store.visits = [];
  vi.mocked(notifications.getPermissionsAsync).mockResolvedValue({
    granted: true,
    canAskAgain: true,
  } as never);
  vi.mocked(notifications.requestPermissionsAsync).mockResolvedValue({
    granted: false,
  } as never);
  vi.mocked(notifications.getAllScheduledNotificationsAsync).mockImplementation(
    async () => [...scheduled.values()] as never,
  );
  vi.mocked(notifications.scheduleNotificationAsync).mockImplementation(
    async (request) => {
      scheduled.set(request.identifier!, {
        identifier: request.identifier!,
        content: {
          title: request.content.title!,
          body: request.content.body!,
          data: request.content.data as { visitId: string },
        },
        trigger: {
          type: "date",
          value: (request.trigger as { date: Date }).date.getTime(),
        },
      });
      return request.identifier!;
    },
  );
  vi.mocked(notifications.cancelScheduledNotificationAsync).mockImplementation(
    async (id) => void scheduled.delete(id),
  );
  vi.mocked(
    notifications.cancelAllScheduledNotificationsAsync,
  ).mockImplementation(async () => scheduled.clear());
});

describe("reminderTime", () => {
  test("avisa a las 8 si no hay hora y media hora antes si la hay", () => {
    expect(reminderTime({ date: "2027-03-10" }).getHours()).toBe(8);
    const timed = reminderTime({ date: "2027-03-10", time: "09:30" });
    expect([timed.getHours(), timed.getMinutes()]).toEqual([9, 0]);
    const early = reminderTime({ date: "2027-03-10", time: "00:10" });
    expect(early.getDate()).toBe(9);
  });
});

describe("VisitRemindersService", () => {
  test("programa con el id de la visita como identificador nativo", async () => {
    const result = await setup().schedule(visit());
    expect(result).toEqual({ id: visit().id });
    expect(notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: visit().id,
        content: expect.objectContaining({
          title: "Revisar instalación",
          data: { visitId: visit().id },
        }),
      }),
    );
  });

  test("editar reemplaza el aviso de la misma visita en vez de duplicarlo", async () => {
    const service = setup();
    await service.schedule(visit());
    await service.schedule(visit({ time: "15:00" }));
    expect(ids()).toEqual([visit().id]);
    expect(when(visit().id).getHours()).toBe(14);
    expect(when(visit().id).getMinutes()).toBe(30);
  });

  test("completar, pasar al pasado o eliminar cancela el aviso correcto y sólo ese", async () => {
    const service = setup();
    await service.schedule(visit());
    await service.schedule(other());
    expect(await service.schedule(visit({ status: VisitStatus.Done }))).toEqual(
      {},
    );
    expect(ids()).toEqual([other().id]);
    await service.schedule(visit());
    await service.schedule(visit({ date: "2020-01-01" }));
    expect(ids()).toEqual([other().id]);
    await service.cancel(other().id);
    expect(ids()).toEqual([]);
  });

  test("informa cuando el permiso fue denegado y quita el aviso anterior", async () => {
    const service = setup();
    await service.schedule(visit());
    vi.mocked(notifications.getPermissionsAsync).mockResolvedValue({
      granted: false,
      canAskAgain: true,
    } as never);
    expect(await service.schedule(visit({ time: "15:00" }))).toEqual({
      denied: true,
    });
    expect(ids()).toEqual([]);
  });

  test("reconcilia sin pedir permisos: reprograma lo faltante, guarda la marca y limpia huérfanos", async () => {
    const missing = visit();
    const finished = other({ status: VisitStatus.Done, reminderId: "viejo" });
    store.visits = [missing, finished];
    scheduled.set("huerfano-sin-visita", stale("huerfano-sin-visita"));
    scheduled.set(finished.id, stale(finished.id));
    await setup().reconcile();
    expect(ids()).toEqual([missing.id]);
    expect(setReminders).toHaveBeenCalledWith({
      [missing.id]: missing.id,
      [finished.id]: null,
    });
    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  test("dos reconciliaciones superpuestas no programan avisos duplicados", async () => {
    store.visits = [visit(), other()];
    // La primera lectura de avisos activos queda retenida hasta soltarla: el orden lo decide el test.
    const release = Promise.withResolvers<void>();
    vi.mocked(
      notifications.getAllScheduledNotificationsAsync,
    ).mockImplementationOnce(async () => {
      await release.promise;
      return [] as never;
    });
    const service = setup();
    const first = service.reconcile();
    const second = service.reconcile();
    await vi.waitFor(() =>
      expect(
        notifications.getAllScheduledNotificationsAsync,
      ).toHaveBeenCalledTimes(1),
    );
    // La segunda no avanzó mientras la primera sigue en curso.
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    release.resolve();
    await Promise.all([first, second]);
    expect(notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    expect(ids()).toEqual([other().id, visit().id].sort());
  });

  test("una edición encolada detrás de una reconciliación deja la hora nueva", async () => {
    store.visits = [visit()];
    const release = Promise.withResolvers<void>();
    vi.mocked(
      notifications.getAllScheduledNotificationsAsync,
    ).mockImplementationOnce(async () => {
      await release.promise;
      return [] as never;
    });
    const service = setup();
    const reconcile = service.reconcile();
    await vi.waitFor(() =>
      expect(
        notifications.getAllScheduledNotificationsAsync,
      ).toHaveBeenCalledTimes(1),
    );
    const edit = service.schedule(visit({ time: "15:00" }));
    release.resolve();
    await Promise.all([reconcile, edit]);
    expect(ids()).toEqual([visit().id]);
    expect(when(visit().id).getHours()).toBe(14);
  });

  test("eliminar mientras se reconcilia no deja el aviso huérfano", async () => {
    store.visits = [visit()];
    const release = Promise.withResolvers<void>();
    vi.mocked(
      notifications.getAllScheduledNotificationsAsync,
    ).mockImplementationOnce(async () => {
      await release.promise;
      return [] as never;
    });
    const service = setup();
    const reconcile = service.reconcile();
    await vi.waitFor(() =>
      expect(
        notifications.getAllScheduledNotificationsAsync,
      ).toHaveBeenCalledTimes(1),
    );
    store.visits = [];
    const removal = service.cancel(visit().id);
    release.resolve();
    await Promise.all([reconcile, removal]);
    expect(ids()).toEqual([]);
  });

  test("restaurar una copia: cancelAll y reconcile dejan un solo aviso por visita", async () => {
    scheduled.set("viejo", stale("viejo"));
    store.visits = [visit()];
    const service = setup();
    await service.cancelAll();
    await Promise.all([service.reconcile(), service.reconcile()]);
    expect(ids()).toEqual([visit().id]);
  });

  test("un fallo en una operación no bloquea las siguientes", async () => {
    vi.mocked(notifications.scheduleNotificationAsync).mockRejectedValueOnce(
      new Error("sin alarma"),
    );
    const service = setup();
    await expect(service.schedule(visit())).rejects.toThrow("sin alarma");
    expect(await service.schedule(visit())).toEqual({ id: visit().id });
  });

  test("si Expo rechaza el reemplazo no queda el aviso de la hora anterior y la próxima conciliación lo recupera", async () => {
    const service = setup();
    const at10 = visit({ time: "10:00" });
    await service.schedule(at10);
    expect(when(at10.id).getHours()).toBe(9);
    expect(when(at10.id).getMinutes()).toBe(30);

    const at15 = visit({ time: "15:00", reminderId: at10.id });
    vi.mocked(notifications.scheduleNotificationAsync).mockRejectedValueOnce(
      new Error("Expo rechazó la reprogramación"),
    );
    await expect(service.schedule(at15)).rejects.toThrow("rechazó");
    // El aviso de las 09:30 no sigue activo con el mismo UUID.
    expect(ids()).toEqual([]);

    store.visits = [at15];
    await service.reconcile();
    expect(ids()).toEqual([at15.id]);
    expect(when(at15.id).getHours()).toBe(14);
    expect(when(at15.id).getMinutes()).toBe(30);
  });

  test("conciliar reemplaza un aviso con el mismo UUID pero otra hora o contenido", async () => {
    const at15 = visit({ time: "15:00", reminderId: visit().id });
    store.visits = [at15];
    // Simula que el aviso viejo no se pudo quitar (por ejemplo, también falló la cancelación).
    scheduled.set(at15.id, {
      ...stale(at15.id),
      trigger: { type: "date", value: reminderTime(visit()).getTime() },
    });
    await setup().reconcile();
    expect(when(at15.id).getHours()).toBe(14);
    expect(scheduled.get(at15.id)?.content.body).toContain("Ana");
  });

  test("conciliar reemplaza un aviso activo sin disparador legible", async () => {
    const at15 = visit({ time: "15:00" });
    store.visits = [at15];
    scheduled.set(at15.id, { ...stale(at15.id), trigger: null as never });
    await setup().reconcile();
    expect(when(at15.id).getHours()).toBe(14);
    expect(setReminders).toHaveBeenCalledWith({ [at15.id]: at15.id });
  });

  test("conciliar no reprograma un aviso que ya coincide con la visita", async () => {
    const service = setup();
    await service.schedule(visit());
    store.visits = [visit({ reminderId: visit().id })];
    vi.mocked(notifications.scheduleNotificationAsync).mockClear();
    await service.reconcile();
    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test("si una visita no se puede reprogramar durante la conciliación, las demás siguen y la marca se limpia", async () => {
    store.visits = [visit({ reminderId: visit().id }), other()];
    vi.mocked(notifications.scheduleNotificationAsync).mockRejectedValueOnce(
      new Error("falla puntual"),
    );
    await setup().reconcile();
    expect(ids()).toEqual([other().id]);
    expect(setReminders).toHaveBeenCalledWith({
      [visit().id]: null,
      [other().id]: other().id,
    });
  });
});
