import { inject, Injectable } from "@angular/core";
import { LocalStorageService } from "../../core/storage/local-storage.service";
import { assertUuid, IdService } from "../../shared/services/id.service";
import { isCalendarDate } from "../../shared/utils/calendar-date";
import {
  VisitKind,
  VisitStatus,
  type Visit,
  type VisitInput,
} from "../models/visit.model";

export const VISITS_STORAGE_KEY = "visits.v1";
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const MAX_TITLE = 120;
export const MAX_NOTES = 1000;

/** Persiste y valida las visitas; las modificaciones se serializan en LocalStorageService. */
@Injectable({ providedIn: "root" })
export class VisitsService {
  private readonly storage = inject(LocalStorageService);
  private readonly ids = inject(IdService);

  async getAll(): Promise<readonly Visit[]> {
    return (await this.storage.read<Visit[]>(VISITS_STORAGE_KEY)) ?? [];
  }

  async create(input: VisitInput): Promise<Visit> {
    const data = this.prepare(input);
    const now = new Date().toISOString();
    const visit: Visit = {
      ...data,
      id: await this.ids.create(),
      status: VisitStatus.Pending,
      createdAt: now,
      updatedAt: now,
    };
    await this.storage.update<Visit[]>(VISITS_STORAGE_KEY, (current) => [
      ...(current ?? []),
      visit,
    ]);
    return visit;
  }

  /** Conserva estado y aviso; quien reprograma el aviso lo actualiza con setReminders. */
  async update(id: string, input: VisitInput): Promise<Visit> {
    const data = this.prepare(input);
    let result!: Visit;
    await this.storage.update<Visit[]>(VISITS_STORAGE_KEY, (current) => {
      const visit = current?.find((value) => value.id === id);
      if (!visit) throw new Error("Visita inexistente.");
      result = { ...visit, ...data, updatedAt: new Date().toISOString() };
      return current!.map((value) => (value.id === id ? result : value));
    });
    return result;
  }

  async setStatus(id: string, status: VisitStatus): Promise<Visit> {
    let result!: Visit;
    await this.storage.update<Visit[]>(VISITS_STORAGE_KEY, (current) => {
      const visit = current?.find((value) => value.id === id);
      if (!visit) throw new Error("Visita inexistente.");
      result = { ...visit, status, updatedAt: new Date().toISOString() };
      return current!.map((value) => (value.id === id ? result : value));
    });
    return result;
  }

  async remove(id: string): Promise<void> {
    await this.storage.update<Visit[]>(VISITS_STORAGE_KEY, (current) => {
      if (!current?.some((visit) => visit.id === id))
        throw new Error("Visita inexistente.");
      return current.filter((visit) => visit.id !== id);
    });
  }

  /** Guarda o quita (null) el aviso programado de cada visita, sin tocar su fecha de modificación. */
  async setReminders(
    reminders: Readonly<Record<string, string | null>>,
  ): Promise<void> {
    if (Object.keys(reminders).length === 0) return;
    await this.storage.update<Visit[]>(VISITS_STORAGE_KEY, (current) =>
      (current ?? []).map((visit) => {
        if (!(visit.id in reminders)) return visit;
        const { reminderId: _previous, ...rest } = visit;
        const next = reminders[visit.id];
        return next ? { ...rest, reminderId: next } : rest;
      }),
    );
  }

  private prepare(
    input: VisitInput,
  ): Omit<Visit, "id" | "status" | "createdAt" | "updatedAt" | "reminderId"> {
    const title = input.title?.trim();
    if (!title) throw new Error("Escribí un título para la visita.");
    if (title.length > MAX_TITLE)
      throw new Error("El título puede tener hasta 120 caracteres.");
    if (!Object.values(VisitKind).includes(input.kind))
      throw new Error("Tipo de visita inválido.");
    if (!isCalendarDate(input.date)) throw new Error("Elegí una fecha válida.");
    const time = input.time?.trim() || undefined;
    if (time && !TIME_PATTERN.test(time))
      throw new Error("La hora debe tener el formato HH:mm.");
    const notes = input.notes?.trim() || undefined;
    if (notes && notes.length > MAX_NOTES)
      throw new Error("Las notas pueden tener hasta 1000 caracteres.");
    if (input.customerId) assertUuid(input.customerId);
    if (input.estimateId) assertUuid(input.estimateId);
    return {
      title,
      kind: input.kind,
      date: input.date,
      time,
      customerId: input.customerId || undefined,
      customerName: input.customerId
        ? input.customerName?.trim() || undefined
        : undefined,
      estimateId: input.estimateId || undefined,
      estimateNumber: input.estimateId
        ? input.estimateNumber?.trim() || undefined
        : undefined,
      notes,
    };
  }
}
