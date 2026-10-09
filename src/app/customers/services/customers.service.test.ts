import { Injector } from "@angular/core";
import { describe, expect, test, vi } from "vitest";
import { CustomersService } from "./customers.service";
import type { Customer, CustomerInput } from "../models/customer.model";
import { LocalStorageService } from "../../core/storage/local-storage.service";
import { IdService } from "../../shared/services/id.service";

function setup() {
  const records = new Map<string, unknown>();
  const storage = new LocalStorageService();
  vi.spyOn(storage, "read").mockImplementation(
    async <T>(key: string) =>
      structuredClone(records.get(key) ?? null) as T | null,
  );
  const write = vi
    .spyOn(storage, "write")
    .mockImplementation(async <T>(key: string, value: T) => {
      records.set(key, structuredClone(value));
    });
  let count = 0;
  const injector = Injector.create({
    providers: [
      CustomersService,
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
  return { customers: injector.get(CustomersService), write };
}
const address = {
  name: "Casa",
  street: "San Martín",
  streetNumber: "S/N",
  city: "Posadas",
  province: "Misiones",
};
const input: CustomerInput = {
  name: " Ana ",
  addresses: [address],
  email: "ana@example.com",
  notes: "Llamar por la tarde",
};

describe("CustomersService", () => {
  test("parte de una lista vacía y devuelve undefined para clientes inexistentes", async () => {
    const { customers } = setup();
    expect(await customers.getAll()).toEqual([]);
    expect(await customers.getById("inexistente")).toBeUndefined();
  });
  test("guarda múltiples direcciones con UUID diferentes y normaliza el nombre", async () => {
    const { customers } = setup();
    const result = await customers.create({
      ...input,
      addresses: [address, { ...address, name: " Local " }],
    });
    expect(result.name).toBe("Ana");
    expect(result.addresses.map((value) => value.name)).toEqual([
      "Casa",
      "Local",
    ]);
    expect(result.addresses[0].id).not.toBe(result.addresses[1].id);
    expect(result.createdAt).toBe(result.updatedAt);
    expect(await customers.getById(result.id)).toEqual(result);
  });
  test.each([
    ["nombre vacío", { ...input, name: " " }],
    ["email inválido", { ...input, email: "sin-arroba" }],
    [
      "dirección sin nombre",
      { ...input, addresses: [{ ...address, name: " " }] },
    ],
    [
      "dirección con ID numérico",
      { ...input, addresses: [{ ...address, id: "123" }] },
    ],
    [
      "teléfono con letras",
      {
        ...input,
        phone: { areaCode: "376", number: "abcdefg", whatsapp: false },
      },
    ],
    [
      "teléfono incompleto",
      { ...input, phone: { areaCode: "376", number: "123", whatsapp: true } },
    ],
  ])("rechaza %s sin persistir cambios", async (_name, invalid) => {
    const { customers, write } = setup();
    await expect(customers.create(invalid)).rejects.toThrow();
    expect(write).not.toHaveBeenCalled();
  });
  test("rechaza UUID de dirección duplicados", async () => {
    const { customers } = setup();
    const id = "00000000-0000-4000-8000-000000000001";
    await expect(
      customers.create({
        ...input,
        addresses: [
          { ...address, id },
          { ...address, id },
        ],
      }),
    ).rejects.toThrow("duplicadas");
  });
  test("edita datos y permite archivar y restaurar sin eliminar al cliente", async () => {
    const { customers } = setup();
    const customer = await customers.create(input);
    const updated = await customers.update(customer.id, {
      name: "Ana García",
      addresses: customer.addresses,
    });
    expect(updated.id).toBe(customer.id);
    expect(updated.createdAt).toBe(customer.createdAt);
    expect(updated.email).toBeUndefined();
    await customers.setArchived(customer.id, true);
    expect((await customers.getById(customer.id))?.archived).toBe(true);
    await customers.setArchived(customer.id, false);
    expect((await customers.getById(customer.id))?.archived).toBe(false);
    expect(await customers.getAll()).toHaveLength(1);
  });
  test("no crea clientes accidentalmente al editar o archivar IDs inexistentes", async () => {
    const { customers, write } = setup();
    await expect(customers.update("inexistente", input)).rejects.toThrow(
      "inexistente",
    );
    await expect(customers.setArchived("inexistente", true)).rejects.toThrow(
      "inexistente",
    );
    expect(write).not.toHaveBeenCalled();
  });
  test("propaga fallos de persistencia sin modificar el cliente guardado", async () => {
    const { customers, write } = setup();
    const customer: Customer = await customers.create(input);
    write.mockRejectedValueOnce(new Error("Disco lleno"));
    await expect(
      customers.update(customer.id, { ...input, name: "Nuevo nombre" }),
    ).rejects.toThrow("Disco lleno");
    expect((await customers.getById(customer.id))?.name).toBe("Ana");
  });
});
