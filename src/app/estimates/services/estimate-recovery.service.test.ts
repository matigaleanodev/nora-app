import { render } from "@ng-native/testing";
import { expect, test, vi } from "vitest";
import { EstimatesPageComponent } from "../pages/estimates-page.component";
import { EstimatesPageService } from "./estimates-page.service";
import { EstimatesService } from "./estimates.service";
import { CustomersService } from "../../customers/services/customers.service";
import { LocalStorageService } from "../../core/storage/local-storage.service";
import { IdService } from "../../shared/services/id.service";
import { EstimateItemType } from "../models/estimate.model";
import {
  customerFixture,
  estimateFixture,
} from "../../shared/testing/domain-fixtures";
const KEY = "estimate-recovery.v1";
function localStore() {
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
  return { storage, write, records };
}
async function setup(local = localStore()) {
  const create = vi.fn().mockImplementation(async (input, id) => ({
    ...estimateFixture,
    ...input,
    id: id ?? estimateFixture.id,
  }));
  const result = await render(EstimatesPageComponent, {
    providers: [
      { provide: LocalStorageService, useValue: local.storage },
      {
        provide: IdService,
        useValue: {
          create: async () => "00000000-0000-4000-8000-000000000099",
        },
      },
      {
        provide: EstimatesService,
        useValue: {
          getAll: async () => [estimateFixture],
          create,
          update: async (id: string) => ({ ...estimateFixture, id }),
        },
      },
      {
        provide: CustomersService,
        useValue: { getAll: async () => [customerFixture] },
      },
    ],
  });
  const vm = result.componentRef.injector.get(EstimatesPageService);
  await vi.waitFor(() => expect(vm.loading()).toBe(false));
  return { ...local, result, vm, create };
}
test("abrir y cerrar un formulario intacto no crea recuperaciones", async () => {
  const { vm, records } = await setup();
  vm.create();
  await vm.back();
  expect(records.has(KEY)).toBe(false);
});
test("conserva texto incompleto y un editor separado después de desmontar y reabrir", async () => {
  const local = localStore();
  const first = await setup(local);
  first.vm.create();
  first.vm.updateForm({ description: "Trabajo pendiente" });
  first.vm.addItem(EstimateItemType.Material);
  first.vm.updateEditor({ description: "Pintura", price: "12," });
  await vi.waitFor(() => expect(first.vm.saveState()).toBe("saved"));
  const id = first.vm.recoveries()[0].id;
  first.result.unmount();
  const second = await setup(local);
  second.vm.resume(second.vm.recoveries()[0]);
  expect(second.vm.recoveries()[0].id).toBe(id);
  expect(second.vm.form().clientId).toBe("");
  expect(second.vm.form().items).toEqual([]);
  expect(second.vm.editor()?.item.price).toBe("12,");
  expect(second.vm.saveState()).toBe("saved");
});
test("serializa escrituras y no anuncia guardado cuando una versión nueva sigue pendiente", async () => {
  const { vm, write, records } = await setup();
  let release!: () => void;
  write.mockImplementationOnce(async <T>(key: string, value: T) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    records.set(key, structuredClone(value));
  });
  vm.create();
  vm.updateForm({ description: "Primero" });
  await vi.waitFor(() => expect(release).toBeTypeOf("function"));
  vm.updateForm({ description: "Más reciente" });
  expect(vm.saveState()).toBe("saving");
  expect(write).toHaveBeenCalledOnce();
  release();
  await vi.waitFor(() => expect(vm.saveState()).toBe("saved"));
  expect(vm.recoveries()[0].form.description).toBe("Más reciente");
});
test("un fallo conserva campos, bloquea volver y permite reintentar", async () => {
  const { vm, write } = await setup();
  write.mockRejectedValueOnce(new Error("Disco lleno"));
  vm.create();
  vm.updateForm({ description: "No perder" });
  await vi.waitFor(() => expect(vm.saveState()).toBe("failed"));
  await vm.back();
  expect(vm.screen()).toBe("form");
  expect(vm.form().description).toBe("No perder");
  vm.retrySave();
  await vi.waitFor(() => expect(vm.saveState()).toBe("saved"));
  await vm.back();
  expect(vm.screen()).toBe("list");
});
test("volver desde el editor conserva su recuperación y cancelar descarta sólo el editor", async () => {
  const { vm } = await setup();
  vm.open(estimateFixture);
  vm.edit();
  const original = structuredClone(vm.form().items);
  vm.editItem(0);
  vm.updateEditor({ price: "99," });
  await vi.waitFor(() => expect(vm.saveState()).toBe("saved"));
  await vm.back();
  expect(vm.activeEditor()).toBeNull();
  expect(vm.editor()?.item.price).toBe("99,");
  vm.updateForm({ notes: "Nueva condición" });
  await vi.waitFor(() => expect(vm.saveState()).toBe("saved"));
  expect(vm.recoveries()[0].editor?.item.price).toBe("99,");
  vm.cancelItem();
  await vi.waitFor(() => expect(vm.saveState()).toBe("saved"));
  expect(vm.form().items).toEqual(original);
  expect(vm.recoveries()[0].editor).toBeNull();
});
test("carga repetida incorpora sólo renglones válidos y mantiene listo el mismo tipo", async () => {
  const { vm } = await setup();
  vm.create();
  vm.addItem(EstimateItemType.Labor);
  vm.updateEditor({ description: "Instalación", price: "1500,50" });
  vm.confirmItem(true);
  expect(vm.form().items).toHaveLength(1);
  expect(vm.editor()?.item.type).toBe(EstimateItemType.Labor);
  expect(vm.editor()?.item.description).toBe("");
  vm.confirmItem();
  expect(vm.form().items).toHaveLength(1);
});
test("revisar mantiene el identificador de recuperación y no duplica el documento", async () => {
  const { vm, create, records } = await setup();
  vm.create();
  vm.updateForm({
    number: "P-999",
    description: "Trabajo",
    clientId: customerFixture.id,
  });
  await vi.waitFor(() => expect(vm.saveState()).toBe("saved"));
  const id = vm.recoveries()[0].id;
  await vm.save();
  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({ number: "P-999" }),
    id,
  );
  expect(vm.selected()?.id).toBe(id);
  expect(records.get(KEY)).toEqual([]);
});

test("conserva datos de recuperación ilegibles sin reemplazarlos por una lista vacía", async () => {
  const local = localStore();
  local.records.set(KEY, { version: "desconocida" });
  const { vm, write, records } = await setup(local);
  expect(vm.error()).toContain("cargar");
  expect(write).not.toHaveBeenCalled();
  expect(records.get(KEY)).toEqual({ version: "desconocida" });
});

test("retoma el mismo documento si el cierre interrumpe la limpieza de recuperación", async () => {
  const local = localStore();
  const first = await setup(local);
  first.vm.open(estimateFixture);
  first.vm.edit();
  first.vm.updateForm({ description: "Cambio recuperado" });
  await vi.waitFor(() => expect(first.vm.saveState()).toBe("saved"));
  const value = {
    ...first.vm.recoveries()[0],
    id: estimateFixture.id,
    estimateId: null,
  };
  local.records.set(KEY, [value]);
  first.result.unmount();
  const second = await setup(local);
  second.vm.resume(second.vm.recoveries()[0]);
  await second.vm.save();
  expect(second.create).not.toHaveBeenCalled();
  expect(second.vm.selected()?.id).toBe(estimateFixture.id);
  expect(local.records.get(KEY)).toEqual([]);
});
