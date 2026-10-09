import { Injector } from "@angular/core";
import { describe, expect, test, vi } from "vitest";
import { TasksService, type Task } from "./tasks.service";
import { LocalStorageService } from "../../core/storage/local-storage.service";
import { NotificationService } from "../../shared/services/notification.service";

function setup(read = vi.fn().mockResolvedValue(null)) {
  const storage = { read, write: vi.fn().mockResolvedValue(undefined) };
  const notifications = { success: vi.fn(), warning: vi.fn(), danger: vi.fn() };
  const injector = Injector.create({
    providers: [
      TasksService,
      { provide: LocalStorageService, useValue: storage },
      { provide: NotificationService, useValue: notifications },
    ],
  });
  return { tasks: injector.get(TasksService), storage, notifications };
}
const saved: readonly Task[] = [
  {
    id: "visita",
    title: "Visita",
    detail: "Casa de Ana",
    category: "Visita",
    done: true,
  },
];
const ready = async (tasks: TasksService) =>
  vi.waitFor(() => expect(tasks.loading()).toBe(false));

describe("TasksService", () => {
  test("carga el historial local y deriva la cantidad de pendientes", async () => {
    const { tasks } = setup(vi.fn().mockResolvedValue(saved));
    await ready(tasks);
    expect(tasks.tasks()).toEqual(saved);
    expect(tasks.pending()).toBe(0);
  });
  test("respeta una lista guardada vacía sin restaurar ejemplos", async () => {
    const { tasks } = setup(vi.fn().mockResolvedValue([]));
    await ready(tasks);
    expect(tasks.tasks()).toEqual([]);
    expect(tasks.pending()).toBe(0);
  });
  test("advierte cuando falla la lectura y finaliza el estado de carga", async () => {
    const { tasks, notifications } = setup(
      vi.fn().mockRejectedValue(new Error("Lectura fallida")),
    );
    await ready(tasks);
    expect(tasks.error()).toContain("leer");
    expect(notifications.warning).toHaveBeenCalledWith(tasks.error());
  });
  test("ignora cambios mientras todavía está cargando", async () => {
    let resolve!: (value: null) => void;
    const { tasks, storage } = setup(
      vi.fn().mockReturnValue(
        new Promise<null>((done) => {
          resolve = done;
        }),
      ),
    );
    await tasks.toggle("estimate");
    expect(storage.write).not.toHaveBeenCalled();
    resolve(null);
    await ready(tasks);
  });
  test("actualiza la tarea sólo al guardar y evita escrituras simultáneas", async () => {
    const { tasks, storage, notifications } = setup();
    await ready(tasks);
    let resolve!: () => void;
    storage.write.mockReturnValueOnce(
      new Promise<void>((done) => {
        resolve = done;
      }),
    );
    const saving = tasks.toggle("estimate");
    expect(tasks.saving()).toBe(true);
    expect(tasks.pending()).toBe(3);
    await tasks.toggle("visit");
    expect(storage.write).toHaveBeenCalledTimes(1);
    resolve();
    await saving;
    expect(tasks.pending()).toBe(2);
    expect(tasks.saving()).toBe(false);
    expect(notifications.success).toHaveBeenCalledWith("Tarea completada.");
    await tasks.toggle("estimate");
    expect(tasks.pending()).toBe(3);
    expect(notifications.success).toHaveBeenLastCalledWith(
      "Tarea marcada como pendiente.",
    );
  });
  test("conserva los datos ante un fallo y permite reintentar", async () => {
    const { tasks, storage, notifications } = setup();
    await ready(tasks);
    storage.write.mockRejectedValueOnce(new Error("Disco lleno"));
    await tasks.toggle("estimate");
    expect(tasks.pending()).toBe(3);
    expect(tasks.saving()).toBe(false);
    expect(notifications.danger).toHaveBeenCalledWith(tasks.error());
    await tasks.toggle("estimate");
    expect(tasks.pending()).toBe(2);
    expect(tasks.error()).toBe("");
  });
});
