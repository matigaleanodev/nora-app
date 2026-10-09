import type { Entity, UUID } from "../../shared/models/entity.model";
import type {
  CustomerAddress,
  CustomerPhone,
} from "../../customers/models/customer.model";
export enum Currency {
  ARS = "ARS",
  USD = "USD",
}
export enum EstimateItemType {
  Material = "material",
  Labor = "labor",
}
export enum MeasurementUnit {
  Meter = "m",
  SquareMeter = "m2",
  CubicMeter = "m3",
  Liter = "l",
  Unit = "unit",
  Hour = "hour",
  Job = "job",
}
export enum EstimateStatus {
  Draft = "draft",
  Sent = "sent",
  Accepted = "accepted",
  Rejected = "rejected",
}
export interface EstimateItemInput {
  readonly description: string;
  readonly type: EstimateItemType;
  /** Cantidad positiva con hasta tres decimales. */
  readonly quantity: number;
  readonly unit: MeasurementUnit;
  /** Precio en centavos enteros de la moneda del presupuesto. */
  readonly unitPriceCents: number;
}
export interface EstimateItem extends EstimateItemInput {
  readonly id: UUID;
}
/** Copia independiente de los datos del cliente; no se actualiza al editar el contacto. */
export interface CustomerSnapshot {
  readonly name: string;
  readonly phone?: CustomerPhone;
  readonly email?: string;
  readonly address?: CustomerAddress;
}
export interface Estimate extends Entity {
  /** Número visible único ingresado por el usuario; no reemplaza al UUID interno. */
  readonly number: string;
  readonly clientId: UUID;
  readonly customerSnapshot: CustomerSnapshot;
  readonly description: string;
  readonly items: readonly EstimateItem[];
  readonly currency: Currency;
  readonly status: EstimateStatus;
  readonly validUntil?: string;
  readonly notes?: string;
}
export interface EstimateInput {
  /** Número visible único ingresado por el usuario; no reemplaza al UUID interno. */
  readonly number: string;
  readonly clientId: UUID;
  readonly addressId?: UUID;
  readonly description: string;
  readonly items: readonly (EstimateItemInput & { readonly id?: UUID })[];
  readonly currency: Currency;
  readonly validUntil?: string;
  readonly notes?: string;
}
