import {
  formatCustomerPhone,
  type CustomerAddress,
  type CustomerPhone,
} from "../models/customer.model";

/** Enlace para marcar el número; el prefijo +549 ya está fijado por el contrato de teléfonos. */
export const phoneLink = (phone: CustomerPhone): string =>
  `tel:${formatCustomerPhone(phone)}`;

/** wa.me exige el número internacional sólo con dígitos. */
export const whatsappLink = (phone: CustomerPhone): string =>
  `https://wa.me/${formatCustomerPhone(phone).replace(/\D/g, "")}`;

export const emailLink = (email: string): string => `mailto:${email.trim()}`;

/** Texto de búsqueda de una dirección; los campos pueden estar incompletos. */
export function addressQuery(address: CustomerAddress): string {
  return [
    [address.street, address.streetNumber].filter(Boolean).join(" ").trim(),
    address.city,
    address.province,
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

/** Sin calle ni ciudad no hay una búsqueda útil: la acción no se ofrece. */
export const canOpenMap = (address: CustomerAddress): boolean =>
  Boolean(address.street.trim() || address.city.trim());

export const mapsLink = (address: CustomerAddress): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${addressQuery(address)}, Argentina`,
  )}`;
