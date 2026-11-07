import { inject, Injectable, signal } from "@angular/core";
import { Dialogs } from "@ng-native/device";
import { CustomersPageService } from "../../customers/services/customers-page.service";
import { EstimatesPageService } from "../../estimates/services/estimates-page.service";
import { NotificationService } from "../../shared/services/notification.service";
import { ShellService } from "../../shared/services/shell.service";
import { summarizeBackup, type BackupSummary } from "../models/backup-file";
import { BackupService } from "./backup.service";

const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;
const pad = (value: number): string => String(value).padStart(2, "0");
/** Fecha local dd/MM/yyyy de un instante ISO. */
export function formatBackupDate(iso: string): string {
  const date = new Date(iso);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}
export function describeBackup(summary: BackupSummary): string {
  return [
    plural(summary.customers, "cliente", "clientes"),
    plural(summary.estimates, "presupuesto", "presupuestos"),
    ...(summary.drafts
      ? [plural(summary.drafts, "borrador en curso", "borradores en curso")]
      : []),
    ...(summary.visits
      ? [plural(summary.visits, "visita agendada", "visitas agendadas")]
      : []),
    ...(summary.profile
      ? [summary.logo ? "datos del negocio con logo" : "datos del negocio"]
      : []),
  ].join(", ");
}

/** Coordina la copia de seguridad manual; el servicio de dominio valida y persiste. */
@Injectable({ providedIn: "root" })
export class BackupPageService {
  private readonly backups = inject(BackupService);
  private readonly notifications = inject(NotificationService);
  private readonly dialogs = inject(Dialogs);
  private readonly shell = inject(ShellService);
  private readonly customers = inject(CustomersPageService);
  private readonly estimates = inject(EstimatesPageService);
  private readonly working = signal(false);
  private readonly errorState = signal("");
  private readonly lastSaved = signal("");
  readonly busy = this.working.asReadonly();
  readonly error = this.errorState.asReadonly();
  /** Resumen de la última copia guardada en esta sesión; no prueba que el usuario la haya conservado. */
  readonly lastCopy = this.lastSaved.asReadonly();

  close(): void {
    if (!this.busy()) this.shell.information.set(null);
  }

  async save(): Promise<void> {
    if (this.busy()) return;
    this.working.set(true);
    this.errorState.set("");
    try {
      const summary = await this.backups.share();
      this.lastSaved.set(
        `${formatBackupDate(summary.createdAt)}: ${describeBackup(summary)}`,
      );
    } catch (error) {
      this.fail(error, "No pudimos crear la copia. Volvé a intentarlo.");
    } finally {
      this.working.set(false);
    }
  }

  async restore(): Promise<void> {
    if (this.busy()) return;
    this.working.set(true);
    this.errorState.set("");
    try {
      const backup = await this.backups.pick();
      if (!backup) return;
      const summary = summarizeBackup(backup);
      const confirmed = await this.dialogs.confirm(
        "¿Reemplazar los datos de este teléfono?",
        {
          message: `La copia del ${formatBackupDate(summary.createdAt)} tiene ${describeBackup(summary)}. Todo lo que hay ahora en este teléfono se va a reemplazar y no se puede recuperar. Si dudás, guardá una copia primero.`,
          confirm: "Reemplazar",
          cancel: "Cancelar",
          destructive: true,
        },
      );
      if (!confirmed) return;
      await this.backups.restore(backup);
      // Las pantallas conservan datos en memoria: se vuelven a leer del teléfono ya restaurado.
      await Promise.all([this.customers.enter(), this.estimates.enter()]);
      this.notifications.success("Copia restaurada.");
    } catch (error) {
      this.fail(
        error,
        "No pudimos restaurar la copia. Tus datos no cambiaron.",
      );
    } finally {
      this.working.set(false);
    }
  }

  private fail(error: unknown, fallback: string): void {
    const message =
      error instanceof Error && error.message ? error.message : fallback;
    this.errorState.set(message);
    this.notifications.danger(message);
  }
}
