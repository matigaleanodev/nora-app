import { injectService } from "@ng-native/testing";
import { Dialogs, HardwareBack, Keyboard } from "@ng-native/device";
import { beforeEach, expect, test, vi } from "vitest";
import { CustomersService } from "../../customers/services/customers.service";
import { NotificationService } from "../../shared/services/notification.service";
import { customerFixture } from "../../shared/testing/domain-fixtures";
import { calendarDateFromLocal } from "../../shared/utils/calendar-date";
import { VisitKind, VisitStatus, type Visit } from "../models/visit.model";
import { AgendaPageService } from "./agenda-page.service";
import { VisitRemindersService } from "./visit-reminders.service";
import { VisitsService } from "./visits.service";

const today = calendarDateFromLocal(new Date());
const visit = (overrides: Partial<Visit> = {}): Visit => ({
  id: "6f1c2f4e-2b1a-4c58-9d0e-1a2b3c4d5e6f",
  title: "Revisar instalación",
  kind: VisitKind.Visit,
  status: VisitStatus.Pending,
  date: today,
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
  ...overrides,
});
const visits = {
  getAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  setStatus: vi.fn(),
  remove: vi.fn(),
  setReminders: vi.fn(),
};
const reminders = {
  reconcile: vi.fn(),
  schedule: vi.fn(),
  cancel: vi.fn(),
  onOpen: vi.fn(),
};
const notifications = { success: vi.fn(), danger: vi.fn(), warning: vi.fn() };
const dialogs = { confirm: vi.fn() };
const customers = { getAll: vi.fn() };
const setup = () =>
  injectService(AgendaPageService, {
    providers: [
      { provide: VisitsService, useValue: visits },
      { provide: VisitRemindersService, useValue: reminders },
      { provide: CustomersService, useValue: customers },
      { provide: NotificationService, useValue: notifications },
      { provide: Dialogs, useValue: dialogs },
      { provide: Keyboard, useValue: { dismiss: vi.fn() } },
      { provide: HardwareBack, useValue: { handle: vi.fn(() => vi.fn()) } },
    ],
  });

beforeEach(() => {
  vi.clearAllMocks();
  visits.getAll.mockResolvedValue([visit()]);
  visits.setReminders.mockResolvedValue(undefined);
  reminders.reconcile.mockResolvedValue(undefined);
  reminders.schedule.mockResolvedValue({ id: "aviso-1" });
  reminders.cancel.mockResolvedValue(undefined);
  dialogs.confirm.mockResolvedValue(true);
  customers.getAll.mockResolvedValue([customerFixture]);
});

test("abre la agenda, concilia los avisos y ordena las visitas por secciones", async () => {
  const service = setup();
  await service.open();
  expect(reminders.reconcile).toHaveBeenCalledTimes(1);
  expect(service.visible()).toBe(true);
  expect(service.sections().map((section) => section.key)).toEqual(["today"]);
});

test("crea una visita, programa el aviso y vuelve a la lista", async () => {
  const service = setup();
  const created = visit({ id: "00000000-0000-4000-8000-000000000001" });
  visits.create.mockResolvedValue(created);
  await service.open();
  service.create({ title: "Presupuestar", time: "10:00" });
  expect(service.screen()).toBe("form");
  await service.save();
  expect(visits.create).toHaveBeenCalledWith(
    expect.objectContaining({ title: "Presupuestar", time: "10:00" }),
  );
  expect(reminders.schedule).toHaveBeenCalledWith(created);
  expect(visits.setReminders).toHaveBeenCalledWith({ [created.id]: "aviso-1" });
  expect(service.screen()).toBe("list");
  expect(notifications.success).toHaveBeenCalled();
});

test("avisa si las notificaciones están desactivadas pero guarda la visita", async () => {
  const service = setup();
  visits.create.mockResolvedValue(visit());
  reminders.schedule.mockResolvedValue({ denied: true });
  await service.open();
  service.create({ title: "Presupuestar" });
  await service.save();
  expect(service.screen()).toBe("list");
  expect(notifications.warning).toHaveBeenCalledWith(
    expect.stringContaining("notificaciones"),
  );
});

test("un error de validación conserva el formulario", async () => {
  const service = setup();
  visits.create.mockRejectedValue(new Error("Escribí un título."));
  await service.open();
  service.create();
  await service.save();
  expect(service.screen()).toBe("form");
  expect(service.error()).toBe("Escribí un título.");
  expect(notifications.danger).toHaveBeenCalledWith("Escribí un título.");
});

test("marcar hecha cancela el aviso", async () => {
  const service = setup();
  const pending = visit({ reminderId: "aviso-1" });
  const done = { ...pending, status: VisitStatus.Done };
  visits.setStatus.mockResolvedValue(done);
  reminders.schedule.mockResolvedValue({});
  await service.open();
  await service.toggleDone(pending);
  expect(visits.setStatus).toHaveBeenCalledWith(pending.id, VisitStatus.Done);
  // schedule deja el aviso acorde al estado: para una visita hecha lo quita.
  expect(reminders.schedule).toHaveBeenCalledWith(done);
  expect(visits.setReminders).toHaveBeenCalledWith({ [pending.id]: null });
});

test("elimina sólo después de confirmar y quita su aviso", async () => {
  const service = setup();
  const saved = visit({ reminderId: "aviso-1" });
  visits.getAll.mockResolvedValue([saved]);
  await service.open();
  service.edit(saved);
  dialogs.confirm.mockResolvedValueOnce(false);
  await service.remove();
  expect(visits.remove).not.toHaveBeenCalled();
  await service.remove();
  expect(visits.remove).toHaveBeenCalledWith(saved.id);
  expect(reminders.cancel).toHaveBeenCalledWith(saved.id);
  expect(service.screen()).toBe("list");
});

test("elige un cliente y pide confirmación para descartar cambios", async () => {
  const service = setup();
  await service.open();
  service.create();
  service.chooseCustomer();
  await vi.waitFor(() => expect(service.customerOptions()).toHaveLength(1));
  service.pickCustomer(customerFixture);
  expect(service.form().customerId).toBe(customerFixture.id);
  expect(service.screen()).toBe("form");
  dialogs.confirm.mockResolvedValueOnce(false);
  await service.back();
  expect(service.screen()).toBe("form");
  await service.back();
  expect(service.screen()).toBe("list");
  await service.back();
  expect(service.visible()).toBe(false);
});

test("abre la visita de un aviso y avisa si ya no existe", async () => {
  const service = setup();
  await service.openVisit(visit().id);
  expect(service.screen()).toBe("form");
  expect(service.editing()).toBe(true);
  await service.openVisit("00000000-0000-4000-8000-0000000000ff");
  expect(notifications.warning).toHaveBeenCalled();
});

test("tocar un aviso con cambios sin guardar pide confirmación y, si sigue editando, conserva el formulario", async () => {
  const service = setup();
  await service.open();
  service.create();
  service.update({ title: "Borrador sin guardar" });
  dialogs.confirm.mockResolvedValueOnce(false);
  await service.openVisit(visit().id);
  expect(dialogs.confirm).toHaveBeenCalledWith(
    "¿Descartar cambios?",
    expect.objectContaining({ cancel: "Seguir editando" }),
  );
  expect(service.screen()).toBe("form");
  expect(service.editing()).toBe(false);
  expect(service.form().title).toBe("Borrador sin guardar");
});

test("tocar un aviso y confirmar el descarte abre la visita del aviso", async () => {
  const service = setup();
  await service.open();
  service.create();
  service.update({ title: "Borrador sin guardar" });
  dialogs.confirm.mockResolvedValueOnce(true);
  await service.openVisit(visit().id);
  expect(dialogs.confirm).toHaveBeenCalledTimes(1);
  expect(service.screen()).toBe("form");
  expect(service.editing()).toBe(true);
  expect(service.form().title).toBe("Revisar instalación");
});

test("tocar un aviso sin cambios pendientes no pide confirmación", async () => {
  const service = setup();
  await service.open();
  service.edit(visit());
  await service.openVisit(visit().id);
  expect(dialogs.confirm).not.toHaveBeenCalled();
  expect(service.editing()).toBe(true);
});

test("tocar un aviso mientras la agenda carga espera la lectura en curso y abre la visita", async () => {
  const service = setup();
  const release = Promise.withResolvers<void>();
  visits.getAll.mockImplementationOnce(async () => {
    await release.promise;
    return [visit()];
  });
  const opening = service.open();
  const tapped = service.openVisit(visit().id);
  release.resolve();
  await Promise.all([opening, tapped]);
  expect(visits.getAll).toHaveBeenCalledTimes(1);
  expect(notifications.warning).not.toHaveBeenCalled();
  expect(service.editing()).toBe(true);
});

test("si no se puede reprogramar el aviso, la visita queda guardada y la marca vieja se limpia", async () => {
  const service = setup();
  const edited = visit({ time: "15:00", reminderId: visit().id });
  visits.getAll.mockResolvedValue([edited]);
  visits.update.mockResolvedValue(edited);
  reminders.schedule.mockRejectedValue(new Error("Expo rechazó el aviso"));
  await service.open();
  service.edit(visit({ reminderId: visit().id }));
  service.update({ time: "15:00" });
  await service.save();
  expect(visits.setReminders).toHaveBeenCalledWith({ [visit().id]: null });
  expect(notifications.warning).toHaveBeenCalledWith(
    expect.stringContaining("no pudimos programar el aviso"),
  );
  expect(service.screen()).toBe("list");
});

const OTRA = "00000000-0000-4000-8000-000000000002";
async function tapDuringSlowLoad(answer: boolean) {
  const service = setup();
  const other = visit({ id: OTRA, title: "Otra visita" });
  visits.getAll.mockResolvedValue([visit(), other]);
  await service.open();
  const gate = Promise.withResolvers<void>();
  reminders.reconcile.mockImplementationOnce(() => gate.promise);
  const tapped = service.openVisit(visit().id);
  await vi.waitFor(() => expect(service.loading()).toBe(true));
  service.edit(other);
  service.update({ title: "Editando la otra" });
  dialogs.confirm.mockResolvedValueOnce(answer);
  gate.resolve();
  return { service, result: await tapped };
}

test("la carga demorada de un aviso no pisa sin confirmar lo que se editó mientras tanto", async () => {
  const { service, result } = await tapDuringSlowLoad(false);
  expect(result).toBe(false);
  expect(dialogs.confirm).toHaveBeenCalledTimes(1);
  expect(service.form().title).toBe("Editando la otra");
  expect(service.screen()).toBe("form");
});

test("si el usuario acepta descartar, la carga demorada abre la visita del aviso", async () => {
  const { service, result } = await tapDuringSlowLoad(true);
  expect(result).toBe(true);
  expect(service.form().title).toBe("Revisar instalación");
});

test("si la carga falla al abrir un aviso muestra el error de la agenda y no dice que la visita no existe", async () => {
  const service = setup();
  visits.getAll.mockRejectedValue(new Error("disco"));
  await service.openVisit(visit().id);
  expect(service.error()).toBe(
    "No pudimos cargar tu agenda. Volvé a intentarlo.",
  );
  expect(notifications.warning).not.toHaveBeenCalled();
});
