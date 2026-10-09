import { Injector } from "@angular/core";
import { describe, expect, test, vi } from "vitest";
import { LocalStorageService } from "../../core/storage/local-storage.service";
import { IdService } from "../../shared/services/id.service";
import { CustomersService } from "../../customers/services/customers.service";
import { formatCustomerPhone } from "../../customers/models/customer.model";
import { EstimatesService } from "./estimates.service";
import {
  Currency,
  EstimateItemType,
  EstimateStatus,
  MeasurementUnit,
  type EstimateInput,
} from "../models/estimate.model";
import {
  calculateEstimateTotal,
  calculateItemSubtotal,
} from "../utils/estimate-totals";

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
  let sequence = 0;
  const injector = Injector.create({
    providers: [
      CustomersService,
      EstimatesService,
      { provide: LocalStorageService, useValue: storage },
      {
        provide: IdService,
        useValue: {
          create: async () =>
            `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`,
        },
      },
    ],
  });
  return {
    customers: injector.get(CustomersService),
    estimates: injector.get(EstimatesService),
    storage,
    write,
    injector,
  };
}
const item = {
  description: "Pintura",
  type: EstimateItemType.Material,
  quantity: 1.25,
  unit: MeasurementUnit.Liter,
  unitPriceCents: 1050,
};
const input = (clientId: string, currency = Currency.ARS): EstimateInput => ({
  number: "P-001",
  clientId,
  description: "Pintura de cocina",
  items: [item],
  currency,
});

describe("servicios locales de clientes y presupuestos", () => {
  test("asigna UUID y conserva escrituras concurrentes e identificadores de direcciones", async () => {
    const { customers } = setup();
    const address = {
      name: "Casa",
      street: "San Martín",
      streetNumber: "S/N",
      city: "Posadas",
      province: "Misiones",
    };
    const [first, second] = await Promise.all([
      customers.create({ name: " Ana ", addresses: [address] }),
      customers.create({ name: "Juan", addresses: [] }),
    ]);
    expect(await customers.getAll()).toHaveLength(2);
    expect(first.id).not.toBe(second.id);
    expect(first.addresses[0].id).toMatch(/^[0-9a-f-]{36}$/);
    const updated = await customers.update(first.id, {
      name: "Ana García",
      addresses: first.addresses,
    });
    expect(updated.addresses[0].id).toBe(first.addresses[0].id);
    expect(updated.createdAt).toBe(first.createdAt);
  });
  test("valida teléfonos argentinos y centraliza el formato +549", async () => {
    const { customers } = setup();
    const phone = { areaCode: "376", number: "4123456", whatsapp: true };
    expect(formatCustomerPhone(phone)).toBe("+5493764123456");
    await expect(
      customers.create({
        name: "Ana",
        addresses: [],
        phone: { ...phone, areaCode: "0376" },
      }),
    ).rejects.toThrow();
    await expect(
      customers.create({ name: " ", addresses: [] }),
    ).rejects.toThrow();
  });
  test("persiste USD y conserva los datos del cliente en presupuestos emitidos", async () => {
    const { customers, estimates } = setup();
    const customer = await customers.create({ name: "Ana", addresses: [] });
    const estimate = await estimates.create(input(customer.id, Currency.USD));
    await estimates.setStatus(estimate.id, EstimateStatus.Sent);
    await customers.update(customer.id, { name: "Ana García", addresses: [] });
    expect((await estimates.getById(estimate.id))?.customerSnapshot.name).toBe(
      "Ana",
    );
    expect((await estimates.getById(estimate.id))?.currency).toBe(Currency.USD);
    await expect(
      estimates.update(estimate.id, input(customer.id)),
    ).rejects.toThrow("borradores");
    await expect(estimates.deleteDraft(estimate.id)).rejects.toThrow(
      "borradores",
    );
    await estimates.setStatus(estimate.id, EstimateStatus.Accepted);
    await expect(
      estimates.setStatus(estimate.id, EstimateStatus.Sent),
    ).rejects.toThrow();
  });
  test("rechaza referencias inválidas y números duplicados", async () => {
    const { customers, estimates } = setup();
    await expect(estimates.create(input("missing"))).rejects.toThrow();
    const customer = await customers.create({ name: "Ana", addresses: [] });
    await expect(
      estimates.create({ ...input(customer.id), addressId: "missing" }),
    ).rejects.toThrow();
    await estimates.create(input(customer.id));
    await expect(estimates.create(input(customer.id))).rejects.toThrow(
      "duplicado",
    );
    await customers.setArchived(customer.id, true);
    await expect(
      estimates.create({ ...input(customer.id), number: "P-002" }),
    ).rejects.toThrow("activo");
    expect(await estimates.getAll()).toHaveLength(1);
  });
  test("recupera la cola tras errores de persistencia sin perder datos", async () => {
    const { customers, write, injector, storage } = setup();
    write.mockRejectedValueOnce(new Error("disk full"));
    await expect(
      customers.create({ name: "Failed", addresses: [] }),
    ).rejects.toThrow("disk full");
    await customers.create({ name: "Saved", addresses: [] });
    const reopened = Injector.create({
      providers: [
        CustomersService,
        { provide: LocalStorageService, useValue: storage },
        { provide: IdService, useValue: injector.get(IdService) },
      ],
    });
    expect(
      (await reopened.get(CustomersService).getAll()).map(
        (customer) => customer.name,
      ),
    ).toEqual(["Saved"]);
  });
});

test("redondea medios centavos por ítem y suma los subtotales redondeados", () => {
  const fractional = { ...item, quantity: 1.005, unitPriceCents: 100 };
  expect(calculateItemSubtotal(fractional)).toBe(101);
  expect(calculateEstimateTotal([fractional, fractional])).toBe(202);
  expect(() => calculateItemSubtotal({ ...item, quantity: 0 })).toThrow();
  expect(() => calculateItemSubtotal({ ...item, quantity: 1.0001 })).toThrow();
  expect(() =>
    calculateItemSubtotal({ ...item, unitPriceCents: 1.5 }),
  ).toThrow();
  expect(() =>
    calculateEstimateTotal([
      { ...item, quantity: 1_000_000, unitPriceCents: Number.MAX_SAFE_INTEGER },
    ]),
  ).toThrow();
});

describe("operaciones de presupuestos", () => {
  test("edita un borrador conservando IDs, elimina el borrador y permite reutilizar su número", async () => {
    const { customers, estimates } = setup();
    const customer = await customers.create({ name: "Ana", addresses: [] });
    const estimate = await estimates.create(input(customer.id));
    const updated = await estimates.update(estimate.id, {
      ...input(customer.id),
      description: "Trabajo actualizado",
      items: estimate.items,
    });
    expect(updated.createdAt).toBe(estimate.createdAt);
    expect(updated.items[0].id).toBe(estimate.items[0].id);
    expect(updated.description).toBe("Trabajo actualizado");
    await estimates.deleteDraft(estimate.id);
    expect(await estimates.getById(estimate.id)).toBeUndefined();
    await expect(estimates.create(input(customer.id))).resolves.toMatchObject({
      number: "P-001",
    });
  });
  test("admite borradores vacíos pero no permite enviarlos ni saltar estados", async () => {
    const { customers, estimates } = setup();
    const customer = await customers.create({ name: "Ana", addresses: [] });
    const estimate = await estimates.create({
      ...input(customer.id),
      items: [],
    });
    await expect(
      estimates.setStatus(estimate.id, EstimateStatus.Sent),
    ).rejects.toThrow("ítem");
    await expect(
      estimates.setStatus(estimate.id, EstimateStatus.Accepted),
    ).rejects.toThrow("estado");
    expect((await estimates.getById(estimate.id))?.status).toBe(
      EstimateStatus.Draft,
    );
  });
  test("copia la dirección elegida sin cambiarla al editar posteriormente al cliente", async () => {
    const { customers, estimates } = setup();
    const customer = await customers.create({
      name: "Ana",
      addresses: [
        {
          name: "Casa",
          street: "San Martín",
          streetNumber: "12",
          city: "Posadas",
          province: "Misiones",
        },
      ],
    });
    const estimate = await estimates.create({
      ...input(customer.id),
      addressId: customer.addresses[0].id,
    });
    await customers.update(customer.id, {
      name: "Ana",
      addresses: [{ ...customer.addresses[0], streetNumber: "99" }],
    });
    expect(
      (await estimates.getById(estimate.id))?.customerSnapshot.address
        ?.streetNumber,
    ).toBe("12");
  });
  test.each([
    ["número vacío", { number: " " }],
    ["descripción vacía", { description: " " }],
    ["fecha inexistente", { validUntil: "2026-02-30" }],
    ["fecha en formato incorrecto", { validUntil: "30/12/2026" }],
    ["ítem sin descripción", { items: [{ ...item, description: " " }] }],
    ["cantidad negativa", { items: [{ ...item, quantity: -1 }] }],
    ["precio negativo", { items: [{ ...item, unitPriceCents: -100 }] }],
    ["ítem con ID numérico", { items: [{ ...item, id: "123" }] }],
  ])("rechaza %s y conserva la colección vacía", async (_name, changes) => {
    const { customers, estimates } = setup();
    const customer = await customers.create({ name: "Ana", addresses: [] });
    await expect(
      estimates.create({ ...input(customer.id), ...changes }),
    ).rejects.toThrow();
    expect(await estimates.getAll()).toEqual([]);
  });
  test("rechaza ítems con identificadores duplicados", async () => {
    const { customers, estimates } = setup();
    const customer = await customers.create({ name: "Ana", addresses: [] });
    const repeated = { ...item, id: "00000000-0000-4000-8000-000000000099" };
    await expect(
      estimates.create({ ...input(customer.id), items: [repeated, repeated] }),
    ).rejects.toThrow("duplicados");
  });
  test("rechaza operaciones sobre presupuestos inexistentes", async () => {
    const { estimates } = setup();
    expect(await estimates.getById("inexistente")).toBeUndefined();
    await expect(estimates.deleteDraft("inexistente")).rejects.toThrow();
    await expect(
      estimates.setStatus("inexistente", EstimateStatus.Sent),
    ).rejects.toThrow("inexistente");
  });
  test("propaga errores al guardar presupuestos y conserva la versión anterior", async () => {
    const { customers, estimates, write } = setup();
    const customer = await customers.create({ name: "Ana", addresses: [] });
    const estimate = await estimates.create(input(customer.id));
    write.mockRejectedValueOnce(new Error("Disco lleno"));
    await expect(
      estimates.update(estimate.id, {
        ...input(customer.id),
        description: "Cambio",
      }),
    ).rejects.toThrow("Disco lleno");
    expect((await estimates.getById(estimate.id))?.description).toBe(
      "Pintura de cocina",
    );
  });
});
