import { inject, Injectable } from "@angular/core";
import type { File, Directory } from "expo-file-system";
import { BusinessProfileService } from "../../business/services/business-profile.service";
import type { BusinessLogo } from "../../business/models/business-profile.model";
import { IdService } from "../../shared/services/id.service";
import type { Estimate } from "../models/estimate.model";
import { buildEstimatePdfHtml } from "../utils/estimate-pdf";

const CACHE_LIFETIME_MS = 24 * 60 * 60 * 1000;
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

/** Genera una copia temporal y abre el selector nativo; no registra un envío confirmado. */
@Injectable({ providedIn: "root" })
export class EstimatePdfService {
  private readonly profiles = inject(BusinessProfileService);
  private readonly ids = inject(IdService);

  async share(estimate: Estimate): Promise<void> {
    const business = await this.profiles.get();
    if (
      typeof business?.displayName !== "string" ||
      !business.displayName.trim()
    )
      throw new Error(
        "Completá tu nombre en Mi negocio antes de compartir el PDF.",
      );
    const sharing = await import("expo-sharing");
    if (!(await sharing.isAvailableAsync()))
      throw new Error("No se puede compartir archivos en este dispositivo.");
    const { File, Directory, Paths } = await import("expo-file-system");
    const logo = business.logo ? await this.readLogo(business.logo) : undefined;
    const html = buildEstimatePdfHtml(estimate, business, logo);
    const directory = new Directory(Paths.cache, "estimate-pdfs");
    directory.create({ idempotent: true, intermediates: true });
    this.removeExpired(directory, File);
    const number =
      estimate.number
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) || "sin-numero";
    const target = new File(
      directory,
      `Presupuesto-${number}-${await this.ids.create()}.pdf`,
    );
    const print = await import("expo-print");
    const result = await print.printToFileAsync({
      html,
      width: 595,
      height: 842,
    });
    const generated = new File(result.uri);
    try {
      if (!generated.exists || generated.size <= 0)
        throw new Error("No pudimos generar el PDF. Volvé a intentarlo.");
      try {
        generated.copy(target);
      } catch (error) {
        this.removeFile(target);
        throw error;
      }
      // La app elegida puede leer el archivo después de cerrar el selector de Android.
      // Conservamos esta copia en caché; una exportación posterior limpia las mayores a un día.
      await sharing.shareAsync(target.uri, {
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
        dialogTitle: `Compartir presupuesto ${estimate.number}`,
      });
    } finally {
      if (generated.parentDirectory.uri.startsWith(Paths.cache.uri))
        this.removeFile(generated);
    }
  }

  private async readLogo(logo: BusinessLogo): Promise<string> {
    const { File, Directory, Paths } = await import("expo-file-system");
    const file = new File(logo.uri);
    const directory = new Directory(Paths.document, "business-logos");
    if (
      !/^image\/(png|jpeg|webp)$/.test(logo.mimeType) ||
      file.parentDirectory.uri !== directory.uri ||
      !file.exists ||
      file.size <= 0 ||
      file.size > MAX_LOGO_BYTES
    )
      throw new Error(
        "No pudimos leer tu logo. Volvé a elegirlo en Mi negocio.",
      );
    return `data:${logo.mimeType};base64,${await file.base64()}`;
  }

  private removeExpired(directory: Directory, FileType: typeof File): void {
    try {
      for (const entry of directory.list()) {
        if (
          entry instanceof FileType &&
          entry.name.endsWith(".pdf") &&
          entry.modificationTime !== null &&
          entry.modificationTime < Date.now() - CACHE_LIFETIME_MS
        )
          this.removeFile(entry);
      }
    } catch {
      // Una limpieza de caché fallida no debe impedir compartir un presupuesto nuevo.
    }
  }

  private removeFile(file: File): void {
    try {
      if (file.exists) file.delete();
    } catch {
      // El sistema también puede recuperar estos temporales cuando necesite espacio.
    }
  }
}
