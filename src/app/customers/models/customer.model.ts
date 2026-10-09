import type { Entity, UUID } from "../../shared/models/entity.model";
/** Teléfono argentino: código de área sin 0 y número sin 15, diez dígitos en total. */
export interface CustomerPhone {
  readonly areaCode: string;
  readonly number: string;
  readonly whatsapp: boolean;
}
export interface CustomerAddress {
  readonly id: UUID;
  readonly name: string;
  readonly street: string;
  readonly streetNumber: string;
  readonly city: string;
  readonly province: string;
  readonly floor?: string;
  readonly apartment?: string;
}
export interface Customer extends Entity {
  readonly name: string;
  readonly phone?: CustomerPhone;
  readonly addresses: readonly CustomerAddress[];
  readonly email?: string;
  readonly notes?: string;
  readonly archived: boolean;
}
export interface CustomerInput {
  readonly name: string;
  readonly phone?: CustomerPhone;
  readonly addresses: readonly (Omit<CustomerAddress, "id"> & {
    readonly id?: UUID;
  })[];
  readonly email?: string;
  readonly notes?: string;
}
/** Aplica el prefijo +549 acordado para la primera versión, limitada a Argentina. */
export function formatCustomerPhone(phone: CustomerPhone): string {
  return `+549${phone.areaCode}${phone.number}`;
}
