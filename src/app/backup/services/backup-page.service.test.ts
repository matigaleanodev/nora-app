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

const backups = { share: vi.fn(), pick: vi.fn(), restore: vi.fn() };
const notifications = { success: vi.fn(), danger: vi.fn() };
const dialogs = { confirm: vi.fn() };
const shell = { information: signal<"backup" | null>("backup") };
const customers = { enter: vi.fn() };
const estimates = { enter: vi.fn() };
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
  customers.enter.mockResolvedValue(undefined);
  estimates.enter.mockResolvedValue(undefined);
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
  expect(customers.enter).toHaveBeenCalled();
  expect(estimates.enter).toHaveBeenCalled();
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
  expect(customers.enter).not.toHaveBeenCalled();
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
  const first = service.save();
  await service.save();
  expect(backups.share).toHaveBeenCalledTimes(1);
  finish();
  await first;
  expect(service.lastCopy()).toContain("06/11/2026");
  backups.share.mockRejectedValueOnce(new Error("Sin permiso"));
  await service.save();
  expect(service.error()).toBe("Sin permiso");
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
