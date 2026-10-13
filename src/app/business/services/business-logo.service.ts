import { inject, Injectable } from "@angular/core";
import { IdService } from "../../shared/services/id.service";
import type { BusinessLogo } from "../models/business-profile.model";
const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
@Injectable({ providedIn: "root" })
export class BusinessLogoService {
  private readonly ids = inject(IdService);
  async pick(): Promise<BusinessLogo | null> {
    const picker = await import("expo-image-picker");
    const result = await picker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 0.85,
    });
    if (result.canceled) return null;
    const asset = result.assets[0];
    const mimeType = asset?.mimeType;
    if (!asset || !mimeType || !(mimeType in EXTENSIONS))
      throw new Error("Elegí un logo JPG, PNG o WebP.");
    if (asset.fileSize && asset.fileSize > MAX_LOGO_BYTES)
      throw new Error("El logo debe pesar como máximo 5 MB.");
    return { uri: asset.uri, mimeType: mimeType as BusinessLogo["mimeType"] };
  }
  /** Copia al almacenamiento durable antes de persistir la referencia en SQLite. */
  async persist(logo: BusinessLogo): Promise<BusinessLogo> {
    if (!(logo.mimeType in EXTENSIONS))
      throw new Error("Formato de logo inválido.");
    const { Directory, File, Paths } = await import("expo-file-system");
    const source = new File(logo.uri);
    if (!source.exists || source.size <= 0)
      throw new Error("No pudimos leer el logo. Volvé a elegirlo.");
    if (source.size > MAX_LOGO_BYTES)
      throw new Error("El logo debe pesar como máximo 5 MB.");
    const directory = new Directory(Paths.document, "business-logos");
    directory.create({ idempotent: true, intermediates: true });
    const target = new File(
      directory,
      `${await this.ids.create()}.${EXTENSIONS[logo.mimeType]}`,
    );
    try {
      source.copy(target);
    } catch (error) {
      // Una copia interrumpida tampoco debe dejar un archivo parcial.
      if (target.exists) target.delete();
      throw error;
    }
    return { uri: target.uri, mimeType: logo.mimeType };
  }
  /** La limpieza nunca borra imágenes originales ni impide guardar el perfil. */
  async removeOwned(logo: BusinessLogo | undefined): Promise<void> {
    if (!logo) return;
    try {
      const { Directory, File, Paths } = await import("expo-file-system");
      const directory = new Directory(Paths.document, "business-logos");
      const file = new File(logo.uri);
      if (file.parentDirectory.uri === directory.uri && file.exists)
        file.delete();
    } catch {
      /* La referencia ya fue guardada: una limpieza fallida no invalida ese guardado. */
    }
  }
}
