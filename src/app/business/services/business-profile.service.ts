import { inject, Injectable } from "@angular/core";
import { LocalStorageService } from "../../core/storage/local-storage.service";
import { BusinessLogoService } from "./business-logo.service";
import type {
  BusinessForm,
  BusinessProfile,
  BusinessLogo,
} from "../models/business-profile.model";
export const BUSINESS_PROFILE_KEY = "business-profile.v1";
@Injectable({ providedIn: "root" })
export class BusinessProfileService {
  private readonly storage = inject(LocalStorageService);
  private readonly logos = inject(BusinessLogoService);
  get(): Promise<BusinessProfile | null> {
    return this.storage.read<BusinessProfile>(BUSINESS_PROFILE_KEY);
  }
  async save(form: BusinessForm): Promise<BusinessProfile> {
    const displayName = form.displayName.trim();
    const email = form.email.trim();
    if (!displayName) throw new Error("Ingresá tu nombre o nombre comercial.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new Error("Email inválido.");
    const areaCode = form.areaCode.trim(),
      number = form.phoneNumber.trim();
    if (
      (areaCode || number) &&
      (!/^\d{2,4}$/.test(areaCode) ||
        !/^\d+$/.test(number) ||
        areaCode.startsWith("0") ||
        areaCode.length + number.length !== 10)
    )
      throw new Error(
        "Ingresá código de área sin 0 y número sin 15: diez dígitos en total.",
      );
    let copied: BusinessLogo | undefined;
    let oldLogo: BusinessLogo | undefined;
    let saved!: BusinessProfile;
    try {
      await this.storage.update<BusinessProfile>(
        BUSINESS_PROFILE_KEY,
        async (previous) => {
          oldLogo = previous?.logo;
          const logo =
            form.logo && form.logo.uri !== oldLogo?.uri
              ? (copied = await this.logos.persist(form.logo))
              : form.logo;
          saved = {
            displayName,
            email: email || undefined,
            phone: areaCode
              ? { areaCode, number, whatsapp: form.whatsapp }
              : undefined,
            logo,
            updatedAt: new Date().toISOString(),
          };
          return saved;
        },
      );
    } catch (error) {
      await this.logos.removeOwned(copied);
      throw error;
    }
    if (oldLogo?.uri !== saved.logo?.uri) await this.logos.removeOwned(oldLogo);
    return saved;
  }
}
