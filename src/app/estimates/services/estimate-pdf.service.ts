import { inject, Injectable } from "@angular/core";
import type { File, Directory } from "expo-file-system";
import { BusinessProfileService } from "../../business/services/business-profile.service";
import type { BusinessLogo } from "../../business/models/business-profile.model";
import { IdService } from "../../shared/services/id.service";
import type { Estimate } from "../models/estimate.model";
import {
  buildEstimatePdf,
  type PdfFonts,
  type PdfLogo,
} from "../utils/estimate-pdf-document";
const CACHE_LIFETIME_MS = 24 * 60 * 60 * 1000;
const MAX_LOGO_BYTES = 5 * 1024 * 1024;
@Injectable({ providedIn: "root" })
export class EstimatePdfService {
  private readonly profiles = inject(BusinessProfileService);
  private readonly ids = inject(IdService);
  private fonts?: Promise<PdfFonts>;
  private prepared?: { key: string; uri: string; size: number };
  async share(estimate: Estimate): Promise<void> {
    const business = await this.profiles.get();
    if (!business?.displayName?.trim())
      throw new Error(
        "Completá tu nombre en Mi negocio antes de compartir el PDF.",
      );
    const sharing = await import("expo-sharing");
    if (!(await sharing.isAvailableAsync()))
      throw new Error("No se puede compartir archivos en este dispositivo.");
    const { File, Directory, Paths } = await import("expo-file-system");
    const key = JSON.stringify({ estimate, business });
    const cached = this.prepared;
    if (cached?.key === key) {
      const file = new File(cached.uri);
      if (
        file.exists &&
        file.size === cached.size &&
        file.modificationTime !== null &&
        file.modificationTime >= Date.now() - CACHE_LIFETIME_MS
      ) {
        await this.shareFile(file, estimate.number, sharing);
        return;
      }
    }
    const [font, logo] = await Promise.all([
      this.readFont(),
      business.logo ? this.readLogo(business.logo) : undefined,
    ]);
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
    try {
      const bytes = await buildEstimatePdf(estimate, business, font, logo);
      if (
        bytes.length < 5 ||
        String.fromCharCode(...bytes.subarray(0, 5)) !== "%PDF-"
      )
        throw new Error("No pudimos generar el PDF. Volvé a intentarlo.");
      target.write(bytes);
      if (!target.exists || target.size !== bytes.length)
        throw new Error(
          "No pudimos guardar el PDF en este teléfono. Volvé a intentarlo.",
        );
      this.prepared = { key, uri: target.uri, size: bytes.length };
    } catch (error) {
      this.removeFile(target);
      throw error;
    }
    await this.shareFile(target, estimate.number, sharing);
  }
  private async shareFile(
    file: File,
    number: string,
    sharing: typeof import("expo-sharing"),
  ): Promise<void> {
    // La aplicación receptora puede leer el archivo después de cerrar el selector.
    await sharing.shareAsync(file.uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: `Compartir presupuesto ${number}`,
    });
  }
  private readFont(): Promise<PdfFonts> {
    return (this.fonts ??= this.loadFonts().catch((error) => {
      this.fonts = undefined;
      throw error;
    }));
  }
  private async loadFonts(): Promise<PdfFonts> {
    const { Asset } = await import("expo-asset");
    const { File } = await import("expo-file-system");
    const load = async (module: number): Promise<Uint8Array> => {
      const asset = Asset.fromModule(module);
      await asset.downloadAsync();
      if (!asset.localUri)
        throw new Error(
          "No pudimos cargar la fuente del PDF. Volvé a intentarlo.",
        );
      return new File(asset.localUri).bytes();
    };
    const [regular, bold] = await Promise.all([
      load(require("../../../../assets/NotoSans.ttf")),
      load(require("../../../../assets/NotoSans-Bold.ttf")),
    ]);
    return { regular, bold };
  }
  private async readLogo(logo: BusinessLogo): Promise<PdfLogo> {
    const { File, Directory, Paths } = await import("expo-file-system");
    const file = new File(logo.uri);
    const directory = new Directory(Paths.document, "business-logos");
    if (
      !/^image\/(png|jpeg|webp)$/.test(logo.mimeType) ||
      file.parentDirectory.uri.replace(/\/$/, "") !==
        directory.uri.replace(/\/$/, "") ||
      !file.exists ||
      file.size <= 0 ||
      file.size > MAX_LOGO_BYTES
    )
      throw new Error(
        "No pudimos leer tu logo. Volvé a elegirlo en Mi negocio.",
      );
    if (logo.mimeType !== "image/webp")
      return {
        bytes: await file.bytes(),
        mimeType: logo.mimeType as "image/png" | "image/jpeg",
      };
    const { ImageManipulator, SaveFormat } =
      await import("expo-image-manipulator");
    const context = ImageManipulator.manipulate(file.uri);
    const image = await context.renderAsync();
    try {
      const result = await image.saveAsync({ format: SaveFormat.PNG });
      const converted = new File(result.uri);
      try {
        return { bytes: await converted.bytes(), mimeType: "image/png" };
      } finally {
        if (converted.uri.startsWith(Paths.cache.uri))
          this.removeFile(converted);
      }
    } finally {
      image.release();
      context.release();
    }
  }
  private removeExpired(directory: Directory, FileType: typeof File): void {
    try {
      for (const entry of directory.list())
        if (
          entry instanceof FileType &&
          entry.name.endsWith(".pdf") &&
          entry.modificationTime !== null &&
          entry.modificationTime < Date.now() - CACHE_LIFETIME_MS
        )
          this.removeFile(entry);
    } catch {
      /* La limpieza de caché no debe impedir una exportación nueva. */
    }
  }
  private removeFile(file: File): void {
    try {
      if (file.exists) file.delete();
    } catch {
      /* Android puede recuperar estos temporales al necesitar espacio. */
    }
  }
}
