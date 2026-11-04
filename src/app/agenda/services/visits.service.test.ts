import { Injector } from "@angular/core";
import { describe, expect, test, vi } from "vitest";
import { LocalStorageService } from "../../core/storage/local-storage.service";
import { IdService } from "../../shared/services/id.service";
import { VisitKind, VisitStatus, type VisitInput } from "../models/visit.model";
import { VisitsService } from "./visits.service";

function setup() {
  const records = new Map<string, unknown>();
  const storage = new LocalStorageService();
  vi.spyOn(storage, "read").mockImplementation(
    async <T>(key: string) =>
      structuredClone(records.get(key) ?? null) as T | null,
  );
  vi.spyOn(storage, "update").mockImplementation(
    async <T>(key: string, change: (current: T | null) => T) => {
      const next = change(
        structuredClone(records.get(key) ?? null) as T | null,
      );
      records.set(key, structuredClone(next));
    },
  );
  let count = 0;
  const injector = Injector.create({
    providers: [
      VisitsService,
      { provide: LocalStorageService, useValue: storage },
      {
        provide: IdService,
        useValue: {
          create: async () =>
            `00000000-0000-4000-8000-${String(++count).padStart(12, "0")}`,
        },
      },
    ],
  });
  return injector.get(VisitsService);
}
const input: VisitInput = {
  title: " Revisar instalación ",
  kind: VisitKind.Visit,
  date: "2026-11-20",
  time: "09:30",
  customerId: "00000000-0000-4000-8000-0000000000aa",
  customerName: " Ana ",
  notes: " Llevar escalera ",
};

describe("VisitsService", () => {
  test("crea una visita pendiente con los textos normalizados", async () => {
    const visits = setup();
    const created = await visits.create(input);
    expect(created).toMatchObject({
      title: "Revisar instalación",
      status: VisitStatus.Pending,
      customerName: "Ana",
      notes: "Llevar escalera",
      time: "09:30",
    });
    expect(await visits.getAll()).toEqual([created]);
  });

  test("rechaza datos inválidos con mensajes claros", async () => {
    const visits = setup();
    await expect(visits.create({ ...input, title: "  " })).rejects.toThrow(
      /título/,
    );
    await expect(
      visits.create({ ...input, date: "2026-02-30" }),
    ).rejects.toThrow(/fecha/);
    await expect(visits.create({ ...input, time: "25:00" })).rejects.toThrow(
      /HH:mm/,
    );
    await expect(
      visits.create({ ...input, customerId: "no-es-uuid" }),
    ).rejects.toThrow();
    expect(await visits.getAll()).toEqual([]);
  });

  test("edita, cambia el estado y elimina; falla si no existe", async () => {
    const visits = setup();
    const { id } = await visits.create(input);
    const edited = await visits.update(id, { ...input, title: "Otro" });
    expect(edited.title).toBe("Otro");
    expect((await visits.setStatus(id, VisitStatus.Done)).status).toBe(
      VisitStatus.Done,
    );
    await visits.remove(id);
    expect(await visits.getAll()).toEqual([]);
    await expect(visits.remove(id)).rejects.toThrow(/inexistente/);
    await expect(visits.update(id, input)).rejects.toThrow(/inexistente/);
  });

  test("guarda y quita avisos sin tocar la fecha de modificación", async () => {
    const visits = setup();
    const created = await visits.create(input);
    await visits.setReminders({ [created.id]: "aviso-1" });
    const [withReminder] = await visits.getAll();
    expect(withReminder?.reminderId).toBe("aviso-1");
    expect(withReminder?.updatedAt).toBe(created.updatedAt);
    await visits.setReminders({ [created.id]: null });
    const [without] = await visits.getAll();
    expect(without && "reminderId" in without).toBe(false);
  });
});
