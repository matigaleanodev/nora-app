/** Mismas reglas que valida el alta de clientes; compartidas con la importación de copias. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Teléfono argentino: código de área sin 0 y número sin 15, diez dígitos en total. */
export function isValidPhone(phone: {
  readonly areaCode: string;
  readonly number: string;
}): boolean {
  return (
    /^\d{2,4}$/.test(phone.areaCode) &&
    /^\d+$/.test(phone.number) &&
    !phone.areaCode.startsWith("0") &&
    phone.areaCode.length + phone.number.length === 10
  );
}
