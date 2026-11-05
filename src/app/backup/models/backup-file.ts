import { VISITS_STORAGE_KEY } from "../../agenda/services/visits.service";
import { BUSINESS_PROFILE_KEY } from "../../business/services/business-profile.service";
import { CUSTOMERS_STORAGE_KEY } from "../../customers/services/customers.service";
import {
  ESTIMATE_RECOVERY_KEY,
  isEstimateRecovery,
} from "../../estimates/services/estimate-recovery.service";
import { ESTIMATES_STORAGE_KEY } from "../../estimates/services/estimates.service";
import {
  isCustomerRecord,
  isEstimateRecord,
  isProfileRecord,
  isVisitRecord,
} from "./backup-records";
import { isValidLogo } from "./logo-image";

/** Claves versionadas que forman parte de la copia; cambiar un esquema exige actualizar el formato. */
export const BACKUP_KEYS = [
  CUSTOMERS_STORAGE_KEY,
  ESTIMATES_STORAGE_KEY,
  BUSINESS_PROFILE_KEY,
  ESTIMATE_RECOVERY_KEY,
  VISITS_STORAGE_KEY,
] as const;
export const BACKUP_FORMAT = 1;
export const MAX_BACKUP_BYTES = 40 * 1024 * 1024;
export const MAX_LOGO_BYTES = 5 * 1024 * 1024;
export const LOGO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type LogoMimeType = (typeof LOGO_MIME_TYPES)[number];

export interface BackupLogo {
  readonly mimeType: LogoMimeType;
  readonly base64: string;
}
export interface BackupFile {
  readonly app: "nora";
  readonly format: typeof BACKUP_FORMAT;
  readonly createdAt: string;
  /** Contenido de las claves de SQLite; el logo del perfil viaja aparte, sin su ruta local. */
  readonly data: Readonly<Record<string, unknown>>;
  readonly logo?: BackupLogo;
}
export interface BackupSummary {
  readonly createdAt: string;
  readonly customers: number;
  readonly estimates: number;
  readonly drafts: number;
  readonly visits: number;
  readonly profile: boolean;
  readonly logo: boolean;
}

const NOT_A_BACKUP = "El archivo no es una copia de seguridad de Nora.";
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const invalid = (detail: string): Error =>
  new Error(`La copia de seguridad está dañada: ${detail}.`);

export function buildBackup(
  data: Readonly<Record<string, unknown>>,
  logo: BackupLogo | undefined,
  now: Date = new Date(),
): BackupFile {
  return {
    app: "nora",
    format: BACKUP_FORMAT,
    createdAt: now.toISOString(),
    data,
    ...(logo ? { logo } : {}),
  };
}

function records(
  data: Record<string, unknown>,
  key: string,
  label: string,
  check: (value: Record<string, unknown>) => boolean,
): readonly Record<string, unknown>[] | undefined {
  const value = data[key];
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw invalid(`${label} no es una lista`);
  const seen = new Set<unknown>();
  for (const entry of value as unknown[]) {
    if (!object(entry) || !check(entry))
      throw invalid(`hay ${label} con datos inválidos`);
    if (seen.has(entry["id"])) throw invalid(`hay ${label} repetidos`);
    seen.add(entry["id"]);
  }
  return value as Record<string, unknown>[];
}

/** Bytes reales de un Base64 canónico: descuenta el relleno `=` en vez de contarlo como datos. */
export function base64ByteLength(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return (base64.length / 4) * 3 - padding;
}

/**
 * Valida la estructura completa antes de que nada toque SQLite: registros anidados, importes en
 * centavos (con las reglas del dominio), fechas, enums y unicidad. Una copia inválida se rechaza entera.
 */
export function parseBackup(raw: string): BackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(NOT_A_BACKUP);
  }
  if (
    !object(parsed) ||
    parsed["app"] !== "nora" ||
    typeof parsed["format"] !== "number"
  )
    throw new Error(NOT_A_BACKUP);
  if (parsed["format"] > BACKUP_FORMAT)
    throw new Error(
      "Esta copia se creó con una versión más nueva de Nora. Actualizá la app para restaurarla.",
    );
  if (parsed["format"] !== BACKUP_FORMAT) throw invalid("formato desconocido");
  const createdAt = parsed["createdAt"];
  if (typeof createdAt !== "string" || !Number.isFinite(Date.parse(createdAt)))
    throw invalid("fecha inválida");
  const source = parsed["data"];
  if (!object(source)) throw invalid("no contiene datos");

  const data: Record<string, unknown> = {};
  const customers = records(
    source,
    CUSTOMERS_STORAGE_KEY,
    "clientes",
    isCustomerRecord,
  );
  if (customers) data[CUSTOMERS_STORAGE_KEY] = customers;
  const estimates = records(
    source,
    ESTIMATES_STORAGE_KEY,
    "presupuestos",
    isEstimateRecord,
  );
  if (estimates) {
    const numbers = new Set(estimates.map((value) => value["number"]));
    if (numbers.size !== estimates.length)
      throw invalid("hay números de presupuesto repetidos");
    data[ESTIMATES_STORAGE_KEY] = estimates;
  }
  const recoveries = records(
    source,
    ESTIMATE_RECOVERY_KEY,
    "borradores en curso",
    isEstimateRecovery,
  );
  if (recoveries) data[ESTIMATE_RECOVERY_KEY] = recoveries;
  const visits = records(source, VISITS_STORAGE_KEY, "visitas", isVisitRecord);
  // El aviso programado es propio de cada teléfono: se vuelve a programar al restaurar.
  if (visits)
    data[VISITS_STORAGE_KEY] = visits.map(
      ({ reminderId: _local, ...rest }) => rest,
    );
  const profile = source[BUSINESS_PROFILE_KEY];
  if (profile !== undefined) {
    if (!isProfileRecord(profile))
      throw invalid("los datos del negocio son inválidos");
    // La ruta del logo es local a cada teléfono: se reconstruye al restaurar.
    const { logo: _local, ...rest } = profile;
    data[BUSINESS_PROFILE_KEY] = rest;
  }

  const logo = parsed["logo"];
  if (logo === undefined)
    return { app: "nora", format: BACKUP_FORMAT, createdAt, data };
  if (!object(logo) || data[BUSINESS_PROFILE_KEY] === undefined)
    throw invalid("el logo no tiene negocio asociado");
  const { mimeType, base64 } = logo;
  if (
    !LOGO_MIME_TYPES.includes(mimeType as LogoMimeType) ||
    typeof base64 !== "string" ||
    base64.length === 0 ||
    base64.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)
  )
    throw invalid("el logo es inválido");
  if (base64ByteLength(base64) > MAX_LOGO_BYTES)
    throw invalid("el logo supera los 5 MB");
  // Base64 válido no basta: los bytes deben ser del formato declarado antes de tocar nada local.
  if (!isValidLogo(mimeType as LogoMimeType, base64))
    throw invalid("el logo no es una imagen válida del formato indicado");
  return {
    app: "nora",
    format: BACKUP_FORMAT,
    createdAt,
    data,
    logo: { mimeType: mimeType as LogoMimeType, base64 },
  };
}

export function summarizeBackup(backup: BackupFile): BackupSummary {
  const count = (key: string): number => {
    const value = backup.data[key];
    return Array.isArray(value) ? value.length : 0;
  };
  return {
    createdAt: backup.createdAt,
    customers: count(CUSTOMERS_STORAGE_KEY),
    estimates: count(ESTIMATES_STORAGE_KEY),
    drafts: count(ESTIMATE_RECOVERY_KEY),
    visits: count(VISITS_STORAGE_KEY),
    profile: backup.data[BUSINESS_PROFILE_KEY] !== undefined,
    logo: backup.logo !== undefined,
  };
}
