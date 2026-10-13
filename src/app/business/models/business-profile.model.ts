import type { ContactForm } from "../../shared/models/contact-form.model";
export interface BusinessLogo {
  readonly uri: string;
  readonly mimeType: "image/jpeg" | "image/png" | "image/webp";
}
export interface BusinessProfile {
  readonly displayName: string;
  readonly phone?: {
    readonly areaCode: string;
    readonly number: string;
    readonly whatsapp: boolean;
  };
  readonly email?: string;
  readonly logo?: BusinessLogo;
  readonly updatedAt: string;
}
export interface BusinessForm extends ContactForm {
  readonly displayName: string;
  readonly logo?: BusinessLogo;
}
