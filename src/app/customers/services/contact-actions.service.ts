import { Injectable } from "@angular/core";

/** Abre otras apps del teléfono (llamadas, WhatsApp, correo, mapas) sin permisos propios. */
@Injectable({ providedIn: "root" })
export class ContactActionsService {
  /**
   * No consulta canOpenURL: en Android 11+ exige declarar paquetes y daría falsos negativos.
   * Falla con un mensaje claro cuando ninguna app puede atender el enlace.
   */
  async open(url: string, failure: string): Promise<void> {
    const { Linking } = await import("react-native");
    try {
      await Linking.openURL(url);
    } catch {
      throw new Error(failure);
    }
  }
}
