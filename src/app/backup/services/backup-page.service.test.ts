import { signal } from "@angular/core";
import { injectService } from "@ng-native/testing";
import { Dialogs } from "@ng-native/device";
import { beforeEach, expect, test, vi } from "vitest";
import { CustomersPageService } from "../../customers/services/customers-page.service";
import { EstimatesPageService } from "../../estimates/services/estimates-page.service";
import { NotificationService } from "../../shared/services/notification.service";
import { ShellService } from "../../shared/services/shell.service";
import { buildBackup } from "../models/backup-file";
import { customerFixture } from "../../shared/testing/domain-fixtures";
import {
  BackupPageService,
  describeBackup,
  formatBackupDate,
} from "./backup-page.service";
import { BackupService } from "./backup.service";

const backups = {
  share: vi.fn(),
  saveToFolder: vi.fn(),
  pick: vi.fn(),
  restore: vi.fn(),
};
const notifications = { success: vi.fn(), danger: vi.fn() };
const dialogs = { confirm: vi.fn() };
const shell = { information: signal<"backup" | null>("backup") };
const customers = { reloadAfterRestore: vi.fn() };
const estimates = { reloadAfterRestore: vi.fn(), flushRecovery: vi.fn() };
const backup = buildBackup(
  { "customers.v1": [customerFixture] },
  undefined,
  new Date(2026, 10, 6, 12),
);
const setup = () =>
  injectService(BackupPageService, {
    providers: [
      { provide: BackupService, useValue: backups },
      { provide: NotificationService, useValue: notifications },
      { provide: Dialogs, useValue: dialogs },
      { provide: CustomersPageService, useValue: customers },
      { provide: EstimatesPageService, useValue: estimates },
      { provide: ShellService, useValue: shell },
    ],
  });

beforeEach(() => {
  vi.clearAllMocks();
  shell.information.set("backup");
  backups.share.mockResolvedValue({
    ...backup,
    customers: 1,
    estimates: 0,
    drafts: 0,
    profile: false,
    logo: false,
  });
  backups.pick.mockResolvedValue(backup);
  backups.restore.mockResolvedValue(undefined);
  dialogs.confirm.mockResolvedValue(true);
  customers.reloadAfterRestore.mockResolvedValue(undefined);
  estimates.reloadAfterRestore.mockResolvedValue(undefined);
  estimates.flushRecovery.mockResolvedValue(true);
});

test("describe la copia con singulares y plurales", () => {
  expect(formatBackupDate(new Date(2026, 10, 6, 12).toISOString())).toBe(
    "06/11/2026",
  );
  expect(
    describeBackup({
      createdAt: "",
      customers: 1,
      estimates: 2,
      drafts: 1,
      visits: 3,
      profile: true,
      logo: true,
    }),
  ).toBe(
    "1 cliente, 2 presupuestos, 1 borrador en curso, 3 visitas agendadas, datos del negocio con logo",
  );
});
test("restaura sólo después de confirmar y vuelve a leer los datos de las pantallas", async () => {
  const service = setup();
  await service.restore();
  expect(dialogs.confirm).toHaveBeenCalledWith(
    "¿Reemplazar los datos de este teléfono?",
    expect.objectContaining({ destructive: true, confirm: "Reemplazar" }),
  );
  expect(backups.restore).toHaveBeenCalledWith(backup);
  expect(customers.reloadAfterRestore).toHaveBeenCalled();
  expect(estimates.reloadAfterRestore).toHaveBeenCalled();
  expect(notifications.success).toHaveBeenCalledWith("Copia restaurada.");
  expect(service.busy()).toBe(false);
});
test("no restaura si el usuario cancela el selector o la confirmación", async () => {
  const service = setup();
  backups.pick.mockResolvedValueOnce(null);
  await service.restore();
  dialogs.confirm.mockResolvedValueOnce(false);
  await service.restore();
  expect(backups.restore).not.toHaveBeenCalled();
  expect(service.error()).toBe("");
  expect(service.busy()).toBe(false);
});
test("muestra el error y no recarga pantallas si la restauración falla", async () => {
  const service = setup();
  backups.restore.mockRejectedValueOnce(new Error("Disco lleno"));
  await service.restore();
  expect(service.error()).toBe("Disco lleno");
  expect(notifications.danger).toHaveBeenCalledWith("Disco lleno");
  expect(customers.reloadAfterRestore).not.toHaveBeenCalled();
  expect(service.busy()).toBe(false);
});
test("guardar la copia informa un error y evita operaciones simultáneas", async () => {
  const service = setup();
  let finish!: () => void;
  backups.share.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = () =>
          resolve({
            createdAt: backup.createdAt,
            customers: 1,
            estimates: 0,
            drafts: 0,
            profile: false,
            logo: false,
          });
      }),
  );
  const first = service.save("share");
  await service.save("share");
  await vi.waitFor(() => expect(backups.share).toHaveBeenCalledTimes(1));
  expect(backups.share).toHaveBeenCalledTimes(1);
  finish();
  await first;
  expect(service.lastCopy()).toContain("06/11/2026");
  backups.share.mockRejectedValueOnce(new Error("Sin permiso"));
  await service.save("share");
  expect(service.error()).toBe("Sin permiso");
});
test("cancelar el selector de carpetas deja el resumen anterior y no anuncia éxito", async () => {
  backups.saveToFolder.mockResolvedValueOnce(null);
  const service = setup();
  await service.save("share");
  const previous = service.lastCopy();
  await service.save("folder");
  expect(backups.saveToFolder).toHaveBeenCalledTimes(1);
  expect(service.lastCopy()).toBe(previous);
  expect(notifications.success).not.toHaveBeenCalled();
  expect(service.error()).toBe("");
});
test("no exporta una copia si quedaron cambios sin guardar", async () => {
  estimates.flushRecovery.mockResolvedValueOnce(false);
  const service = setup();
  await service.save("folder");
  expect(backups.saveToFolder).not.toHaveBeenCalled();
  expect(service.error()).toContain("Reintentá guardar");
});
test("no se cierra la pantalla mientras trabaja y sí cuando termina", async () => {
  const service = setup();
  let finish!: () => void;
  backups.pick.mockImplementationOnce(
    () => new Promise((resolve) => (finish = () => resolve(null))),
  );
  const running = service.restore();
  service.close();
  expect(shell.information()).toBe("backup");
  finish();
  await running;
  service.close();
  expect(shell.information()).toBeNull();
});
