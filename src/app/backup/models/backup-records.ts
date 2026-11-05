import { VisitKind, VisitStatus } from "../../agenda/models/visit.model";
import {
  MAX_NOTES,
  MAX_TITLE,
  TIME_PATTERN,
} from "../../agenda/services/visits.service";
import {
  EMAIL_PATTERN,
  isValidPhone,
} from "../../customers/utils/customer-rules";
import {
  Currency,
  EstimateItemType,
  EstimateStatus,
  MeasurementUnit,
} from "../../estimates/models/estimate.model";
import { calculateEstimateTotal } from "../../estimates/utils/estimate-totals";
import { assertUuid } from "../../shared/services/id.service";
import { isCalendarDate } from "../../shared/utils/calendar-date";

/**
 * Reglas estructurales de lo que las pantallas consumen de cada registro importado. Se validan los
 * registros anidados (ítems, direcciones, snapshots) porque una copia dañada reemplazaría los datos locales.
 */
type Row = Record<string, unknown>;

const object = (value: unknown): value is Row =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const optional = (value: unknown): boolean =>
  value === undefined || typeof value === "string";
const stamp = (value: unknown): boolean =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
const oneOf = <T extends string>(
  values: Record<string, T>,
  value: unknown,
): boolean => Object.values(values).includes(value as T);
export function uuid(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    assertUuid(value);
    return true;
  } catch {
    return false;
  }
}
const optionalUuid = (value: unknown): boolean =>
  value === undefined || uuid(value);
// El alta de clientes acepta un email vacío como "sin email", así que la copia también.
const email = (value: unknown): boolean =>
  value === undefined ||
  (typeof value === "string" && (value === "" || EMAIL_PATTERN.test(value)));
function phone(value: unknown): boolean {
  if (value === undefined) return true;
  return (
    object(value) &&
    typeof value["areaCode"] === "string" &&
    typeof value["number"] === "string" &&
    typeof value["whatsapp"] === "boolean" &&
    isValidPhone({ areaCode: value["areaCode"], number: value["number"] })
  );
}
function address(value: unknown): boolean {
  return (
    object(value) &&
    uuid(value["id"]) &&
    text(value["name"]) &&
    ["street", "streetNumber", "city", "province"].every(
      (key) => typeof value[key] === "string",
    ) &&
    optional(value["floor"]) &&
    optional(value["apartment"])
  );
}
const unique = (rows: readonly unknown[]): boolean =>
  new Set(rows.map((row) => (row as Row)["id"])).size === rows.length;

export function isCustomerRecord(value: Row): boolean {
  const addresses = value["addresses"];
  return (
    uuid(value["id"]) &&
    text(value["name"]) &&
    phone(value["phone"]) &&
    email(value["email"]) &&
    optional(value["notes"]) &&
    Array.isArray(addresses) &&
    addresses.every(address) &&
    unique(addresses) &&
    typeof value["archived"] === "boolean" &&
    stamp(value["createdAt"]) &&
    stamp(value["updatedAt"])
  );
}

function item(value: unknown): boolean {
  return (
    object(value) &&
    uuid(value["id"]) &&
    text(value["description"]) &&
    oneOf(EstimateItemType, value["type"]) &&
    oneOf(MeasurementUnit, value["unit"]) &&
    typeof value["quantity"] === "number" &&
    typeof value["unitPriceCents"] === "number"
  );
}
function snapshot(value: unknown): boolean {
  return (
    object(value) &&
    text(value["name"]) &&
    phone(value["phone"]) &&
    email(value["email"]) &&
    (value["address"] === undefined || address(value["address"]))
  );
}
/** Los importes se recalculan con las reglas del dominio: centavos enteros, cantidades y rangos válidos. */
function amounts(items: readonly unknown[]): boolean {
  try {
    calculateEstimateTotal(
      items as Parameters<typeof calculateEstimateTotal>[0],
    );
    return true;
  } catch {
    return false;
  }
}
export function isEstimateRecord(value: Row): boolean {
  const items = value["items"];
  return (
    uuid(value["id"]) &&
    uuid(value["clientId"]) &&
    text(value["number"]) &&
    text(value["description"]) &&
    oneOf(Currency, value["currency"]) &&
    oneOf(EstimateStatus, value["status"]) &&
    snapshot(value["customerSnapshot"]) &&
    Array.isArray(items) &&
    items.every(item) &&
    unique(items) &&
    amounts(items) &&
    (value["validUntil"] === undefined ||
      (typeof value["validUntil"] === "string" &&
        (value["validUntil"] === "" || isCalendarDate(value["validUntil"])))) &&
    optional(value["notes"]) &&
    stamp(value["createdAt"]) &&
    stamp(value["updatedAt"])
  );
}

export function isVisitRecord(value: Row): boolean {
  return (
    uuid(value["id"]) &&
    text(value["title"]) &&
    (value["title"] as string).length <= MAX_TITLE &&
    oneOf(VisitKind, value["kind"]) &&
    oneOf(VisitStatus, value["status"]) &&
    typeof value["date"] === "string" &&
    isCalendarDate(value["date"]) &&
    (value["time"] === undefined ||
      (typeof value["time"] === "string" &&
        TIME_PATTERN.test(value["time"]))) &&
    optionalUuid(value["customerId"]) &&
    optionalUuid(value["estimateId"]) &&
    optional(value["customerName"]) &&
    optional(value["estimateNumber"]) &&
    optional(value["reminderId"]) &&
    optional(value["notes"]) &&
    ((value["notes"] as string | undefined)?.length ?? 0) <= MAX_NOTES &&
    stamp(value["createdAt"]) &&
    stamp(value["updatedAt"])
  );
}

export function isProfileRecord(value: unknown): value is Row {
  return (
    object(value) &&
    text(value["displayName"]) &&
    phone(value["phone"]) &&
    email(value["email"]) &&
    (value["updatedAt"] === undefined || stamp(value["updatedAt"]))
  );
}
