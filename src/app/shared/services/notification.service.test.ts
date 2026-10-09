import { afterEach, expect, test, vi } from "vitest";
import { NotificationService } from "./notification.service";

afterEach(() => vi.useRealTimers());

test("reemplazar un aviso cancela el temporizador del aviso anterior", () => {
  vi.useFakeTimers();
  const notifications = new NotificationService();
  notifications.success("Guardado");
  vi.advanceTimersByTime(4000);
  notifications.danger("No se pudo guardar");
  vi.advanceTimersByTime(10000);
  expect(notifications.toast()).toEqual({
    variant: "danger",
    message: "No se pudo guardar",
  });
  notifications.dismiss();
  expect(notifications.toast()).toBeNull();
});

test("el éxito se cierra automáticamente y la advertencia permanece; permite configurar la duración", () => {
  vi.useFakeTimers();
  const notifications = new NotificationService();
  notifications.success("Guardado");
  vi.advanceTimersByTime(5000);
  expect(notifications.toast()).toBeNull();
  notifications.warning("Revisá los datos");
  vi.advanceTimersByTime(60000);
  expect(notifications.toast()?.variant).toBe("warning");
  notifications.success("Guardado", { durationMs: 1000 });
  vi.advanceTimersByTime(1000);
  expect(notifications.toast()).toBeNull();
  notifications.success("Sin temporizador", { durationMs: 0 });
  notifications.ngOnDestroy();
  expect(vi.getTimerCount()).toBe(0);
});

test("ignora mensajes vacíos sin reemplazar el aviso activo", () => {
  const notifications = new NotificationService();
  notifications.warning("Revisá los datos");
  notifications.success("   ");
  expect(notifications.toast()?.message).toBe("Revisá los datos");
  notifications.dismiss();
});
test("el cierre manual y la destrucción liberan temporizadores activos", () => {
  vi.useFakeTimers();
  const notifications = new NotificationService();
  notifications.success("Guardado");
  expect(vi.getTimerCount()).toBe(1);
  notifications.dismiss();
  expect(vi.getTimerCount()).toBe(0);
  notifications.success("Otro guardado");
  notifications.ngOnDestroy();
  expect(vi.getTimerCount()).toBe(0);
});
