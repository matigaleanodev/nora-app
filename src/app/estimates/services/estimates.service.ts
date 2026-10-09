import { isCalendarDate } from "../../shared/utils/calendar-date";
import { inject, Injectable } from "@angular/core";
import { LocalStorageService } from "../../core/storage/local-storage.service";
import { assertUuid, IdService } from "../../shared/services/id.service";
import { CustomersService } from "../../customers/services/customers.service";
import {
  Currency,
  EstimateItemType,
  MeasurementUnit,
  EstimateStatus,
  type Estimate,
  type EstimateInput,
} from "../models/estimate.model";
import { calculateEstimateTotal } from "../utils/estimate-totals";

const STORAGE_KEY = "estimates.v1";
@Injectable({ providedIn: "root" })
export class EstimatesService {
  private readonly storage = inject(LocalStorageService);
  private readonly ids = inject(IdService);
  private readonly customers = inject(CustomersService);
  async getAll(): Promise<readonly Estimate[]> {
    return (await this.storage.read<Estimate[]>(STORAGE_KEY)) ?? [];
  }
  async getById(id: string): Promise<Estimate | undefined> {
    return (await this.getAll()).find((estimate) => estimate.id === id);
  }
  async create(input: EstimateInput): Promise<Estimate> {
    const data = await this.prepare(input);
    const now = new Date().toISOString();
    const estimate: Estimate = {
      ...data,
      id: await this.ids.create(),
      createdAt: now,
      updatedAt: now,
      status: EstimateStatus.Draft,
    };
    await this.storage.update<Estimate[]>(STORAGE_KEY, (current) => {
      this.checkNumber(current ?? [], estimate.number);
      return [...(current ?? []), estimate];
    });
    return estimate;
  }
  /** Edita sólo borradores y vuelve a copiar los datos actuales del cliente y la dirección. */
  async update(id: string, input: EstimateInput): Promise<Estimate> {
    const data = await this.prepare(input);
    let result!: Estimate;
    await this.storage.update<Estimate[]>(STORAGE_KEY, (current) => {
      const estimate = current?.find((value) => value.id === id);
      if (!estimate || estimate.status !== EstimateStatus.Draft)
        throw new Error("Sólo se pueden editar borradores.");
      this.checkNumber(current ?? [], data.number, id);
      result = { ...estimate, ...data, updatedAt: new Date().toISOString() };
      return current!.map((value) => (value.id === id ? result : value));
    });
    return result;
  }
  /**
   * Registra el avance borrador → enviado → aceptado/rechazado, sin modificar el snapshot.
   * Cambiar a enviado no genera un PDF ni envía mensajes; sólo registra el estado local.
   */
  async setStatus(id: string, status: EstimateStatus): Promise<void> {
    await this.storage.update<Estimate[]>(STORAGE_KEY, (current) => {
      const estimate = current?.find((value) => value.id === id);
      if (!estimate) throw new Error("Presupuesto inexistente.");
      const allowed =
        estimate.status === EstimateStatus.Draft
          ? [EstimateStatus.Sent]
          : estimate.status === EstimateStatus.Sent
            ? [EstimateStatus.Accepted, EstimateStatus.Rejected]
            : [];
      if (!allowed.includes(status))
        throw new Error("Cambio de estado inválido.");
      if (!estimate.items.length)
        throw new Error("Agregá al menos un ítem antes de enviar.");
      return current!.map((value) =>
        value.id === id
          ? { ...value, status, updatedAt: new Date().toISOString() }
          : value,
      );
    });
  }
  async deleteDraft(id: string): Promise<void> {
    await this.storage.update<Estimate[]>(STORAGE_KEY, (current) => {
      const estimate = current?.find((value) => value.id === id);
      if (!estimate || estimate.status !== EstimateStatus.Draft)
        throw new Error("Sólo se pueden eliminar borradores.");
      return current!.filter((value) => value.id !== id);
    });
  }
  private checkNumber(
    estimates: readonly Estimate[],
    number: string,
    id?: string,
  ): void {
    if (
      estimates.some(
        (estimate) => estimate.id !== id && estimate.number === number,
      )
    )
      throw new Error("Número de presupuesto duplicado.");
  }
  private async prepare(
    input: EstimateInput,
  ): Promise<Omit<Estimate, "id" | "createdAt" | "updatedAt" | "status">> {
    if (!input.number?.trim() || !input.description?.trim())
      throw new Error("Número y descripción obligatorios.");
    if (!Object.values(Currency).includes(input.currency))
      throw new Error("Moneda inválida.");
    if (input.validUntil && !isCalendarDate(input.validUntil))
      throw new Error("Fecha inválida.");
    const customer = await this.customers.getById(input.clientId);
    if (!customer || customer.archived)
      throw new Error("Seleccioná un cliente activo.");
    const address = customer.addresses.find(
      (value) => value.id === input.addressId,
    );
    if (input.addressId && !address)
      throw new Error("La dirección no pertenece al cliente.");
    calculateEstimateTotal(input.items);
    const items = await Promise.all(
      input.items.map(async (item) => {
        if (
          !item.description?.trim() ||
          !Object.values(EstimateItemType).includes(item.type) ||
          !Object.values(MeasurementUnit).includes(item.unit)
        )
          throw new Error("Ítem inválido.");
        if (item.id) assertUuid(item.id);
        return {
          ...item,
          description: item.description.trim(),
          id: item.id ?? (await this.ids.create()),
        };
      }),
    );
    if (new Set(items.map((item) => item.id)).size !== items.length)
      throw new Error("Ítems duplicados.");
    return {
      number: input.number.trim(),
      clientId: customer.id,
      // El documento conserva estos datos aunque el cliente cambie después.
      customerSnapshot: {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address,
      },
      description: input.description.trim(),
      items,
      currency: input.currency,
      validUntil: input.validUntil,
      notes: input.notes,
    };
  }
}
