import { inject, Injectable } from "@angular/core";
import type { File } from "expo-file-system";
import { LocalStorageService } from "../../core/storage/local-storage.service";
import type { BusinessProfile } from "../../business/models/business-profile.model";
import { VisitRemindersService } from "../../agenda/services/visit-reminders.service";
import { BUSINESS_PROFILE_KEY } from "../../business/services/business-profile.service";
import { BusinessLogoService } from "../../business/services/business-logo.service";
import {
  BACKUP_KEYS,
  buildBackup,
  MAX_BACKUP_BYTES,
  parseBackup,
  summarizeBackup,
  type BackupFile,
  type BackupLogo,
  type BackupSummary,
} from "../models/backup-file";
import type { Visit } from "../../agenda/models/visit.model";
import { VISITS_STORAGE_KEY } from "../../agenda/services/visits.service";
import { convertWebpToPng } from "../../shared/utils/webp-to-png";
import { canEmbed, isUsableLogo, type LogoMime } from "../models/logo-image";

const pad = (value: number): string => String(value).padStart(2, "0");

/** Exporta e importa todos los datos locales como un único archivo JSON versionado. */
@Injectable({ providedIn: "root" })
export class BackupService {
  private readonly storage = inject(LocalStorageService);
  private readonly logos = inject(BusinessLogoService);
  private readonly reminders = inject(VisitRemindersService);
  /** Copias cuyo logo ya se decodificó al elegirlas: restaurarlas no repite el trabajo. */
  private readonly verified = new WeakSet<BackupFile>();

  /** Genera la copia en la caché del teléfono y abre la hoja para guardarla o enviarla. */
  async share(): Promise<BackupSummary> {
    const sharing = await import("expo-sharing");
    if (!(await sharing.isAvailableAsync()))
      throw new Error("No se puede compartir archivos en este dispositivo.");
    const { file, summary } = await this.create();
    await sharing.shareAsync(file.uri, {
      mimeType: "application/json",
      UTI: "public.json",
      dialogTitle: "Guardar copia de seguridad de Nora",
    });
    return summary;
  }

  async create(now: Date = new Date()): Promise<{
    file: File;
    summary: BackupSummary;
  }> {
    const data: Record<string, unknown> = {
      ...(await this.storage.readMany(BACKUP_KEYS)),
    };
    let logo: BackupLogo | undefined;
    const profile = data[BUSINESS_PROFILE_KEY] as BusinessProfile | undefined;
    if (profile?.logo) {
      const base64 = await this.logos.readBase64(profile.logo);
      // Un logo que la importación rechazaría no se incluye: la copia siempre se puede restaurar.
      if (base64 && (await this.isUsable(profile.logo.mimeType, base64)))
        logo = { mimeType: profile.logo.mimeType, base64 };
      const { logo: _local, ...rest } = profile;
      data[BUSINESS_PROFILE_KEY] = rest;
    }
    // El marcador de aviso es local de cada teléfono: la importación lo reconstruye.
    const visits = data[VISITS_STORAGE_KEY] as Visit[] | undefined;
    if (visits)
      data[VISITS_STORAGE_KEY] = visits.map(
        ({ reminderId: _local, ...rest }) => rest,
      );
    const backup = buildBackup(data, logo, now);
    const { Directory, File, Paths } = await import("expo-file-system");
    const directory = new Directory(Paths.cache, "backups");
    directory.create({ idempotent: true, intermediates: true });
    this.clean(directory);
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const file = new File(directory, `copia-nora-${date}.json`);
    const content = JSON.stringify(backup);
    try {
      file.write(content);
      if (!file.exists || file.size <= 0)
        throw new Error(
          "No pudimos guardar la copia en este teléfono. Volvé a intentarlo.",
        );
      // El mismo tope que aplica la importación: no se comparte una copia que después no se podría restaurar.
      if (file.size > MAX_BACKUP_BYTES)
        throw new Error(
          "La copia supera los 40 MiB y no se podría restaurar, así que no la compartimos.",
        );
    } catch (error) {
      if (file.exists) file.delete();
      throw error;
    }
    return { file, summary: summarizeBackup(backup) };
  }

  /** Abre el selector del sistema; devuelve null si se cancela y falla con un mensaje si el archivo no sirve. */
  async pick(): Promise<BackupFile | null> {
    const picker = await import("expo-document-picker");
    const result = await picker.getDocumentAsync({
      type: "*/*",
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return null;
    const asset = result.assets[0];
    if (!asset) return null;
    const { File } = await import("expo-file-system");
    const file = new File(asset.uri);
    try {
      if (!file.exists || file.size <= 0)
        throw new Error("No pudimos leer el archivo elegido.");
      if (file.size > MAX_BACKUP_BYTES)
        throw new Error(
          "El archivo es demasiado grande para ser una copia de Nora.",
        );
      const backup = parseBackup(await file.text());
      await this.assertLogoUsable(backup);
      this.verified.add(backup);
      return backup;
    } finally {
      // Es una copia temporal del selector; el archivo original queda intacto.
      try {
        if (file.exists) file.delete();
      } catch {
        /* La limpieza de la caché no invalida la lectura. */
      }
    }
  }

  /**
   * Reemplaza los datos locales por los de la copia en una transacción. El logo nuevo se escribe antes
   * y el anterior se elimina después, de modo que un fallo no deja el perfil apuntando a un archivo ausente.
   */
  async restore(backup: BackupFile): Promise<void> {
    await this.assertLogoUsable(backup);
    const previous = (await this.storage.readMany([BUSINESS_PROFILE_KEY]))[
      BUSINESS_PROFILE_KEY
    ] as BusinessProfile | undefined;
    const entries: Record<string, unknown> = { ...backup.data };
    let restored: BusinessProfile["logo"];
    if (backup.logo) {
      restored = await this.logos.restore(
        backup.logo.base64,
        backup.logo.mimeType,
      );
      entries[BUSINESS_PROFILE_KEY] = {
        ...(entries[BUSINESS_PROFILE_KEY] as object),
        logo: restored,
      };
    }
    try {
      await this.storage.replaceMany(BACKUP_KEYS, entries);
    } catch (error) {
      await this.logos.removeOwned(restored);
      throw error;
    }
    await this.logos.removeOwned(previous?.logo);
    await this.rescheduleReminders();
  }

  /** Un logo que no se puede decodificar tampoco serviría para el PDF: se rechaza antes de tocar los datos. */
  private async assertLogoUsable(backup: BackupFile): Promise<void> {
    if (this.verified.has(backup)) return;
    if (
      backup.logo &&
      !(await this.isUsable(backup.logo.mimeType, backup.logo.base64))
    )
      throw new Error(
        "El logo de la copia no es una imagen que Nora pueda usar. Tus datos no cambiaron.",
      );
  }

  /** Estructura y decodificación; el WebP además debe poder convertirse con la conversión nativa que usa el PDF. */
  private async isUsable(mimeType: LogoMime, base64: string): Promise<boolean> {
    if (!(await isUsableLogo(mimeType, base64))) return false;
    return mimeType !== "image/webp" || (await this.webpConverts(base64));
  }

  /** Escribe el WebP en un temporal de la caché, lo convierte y lo incrusta; elimina el temporal siempre. */
  private async webpConverts(base64: string): Promise<boolean> {
    const { Directory, File, Paths } = await import("expo-file-system");
    const directory = new Directory(Paths.cache, "logo-check");
    directory.create({ idempotent: true, intermediates: true });
    const file = new File(
      directory,
      `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`,
    );
    try {
      file.write(base64, { encoding: "base64" });
      const bytes = await convertWebpToPng(file.uri);
      return await canEmbed({ bytes, mimeType: "image/png" });
    } catch {
      return false;
    } finally {
      try {
        if (file.exists) file.delete();
      } catch {
        /* Un temporal en la caché no invalida la comprobación. */
      }
    }
  }

  /** Los avisos de las visitas reemplazadas ya no valen: se quitan y se programan los de la copia. */
  private async rescheduleReminders(): Promise<void> {
    try {
      await this.reminders.cancelAll();
      await this.reminders.reconcile();
    } catch {
      /* La copia ya está restaurada; los avisos se corrigen al abrir la app. */
    }
  }

  private clean(directory: import("expo-file-system").Directory): void {
    try {
      for (const entry of directory.list()) entry.delete();
    } catch {
      /* Copias antiguas en la caché no impiden crear la nueva. */
    }
  }
}
