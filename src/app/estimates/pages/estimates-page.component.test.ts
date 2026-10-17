import { EstimateRecoveryService } from "../services/estimate-recovery.service";
import { IdService } from "../../shared/services/id.service";
import { render, screen, userEvent, fireEvent } from "@ng-native/testing";
import { Dialogs } from "@ng-native/device";
import { expect, test, vi } from "vitest";
import { EstimatesPageComponent } from "./estimates-page.component";
import { EstimatesService } from "../services/estimates.service";
import { EstimatesPageService } from "../services/estimates-page.service";
import { EstimatePdfService } from "../services/estimate-pdf.service";
import { CustomersService } from "../../customers/services/customers.service";
import { NotificationService } from "../../shared/services/notification.service";
import {
  customerFixture,
  estimateFixture,
} from "../../shared/testing/domain-fixtures";
import {
  Currency,
  EstimateStatus,
  type Estimate,
} from "../models/estimate.model";

async function setup(
  record: Estimate | null = estimateFixture,
  hasCustomers = true,
) {
  const estimates = {
    getAll: vi.fn().mockResolvedValue(record ? [record] : []),
    create: vi.fn().mockResolvedValue(estimateFixture),
    update: vi.fn().mockResolvedValue(estimateFixture),
    deleteDraft: vi.fn().mockResolvedValue(undefined),
    setStatus: vi.fn().mockResolvedValue(undefined),
  };
  const customers = {
    getAll: vi.fn().mockResolvedValue(hasCustomers ? [customerFixture] : []),
  };
  const pdf = { share: vi.fn().mockResolvedValue(undefined) };
  const confirm = vi.fn().mockResolvedValue(true);
  const notifications = { success: vi.fn(), danger: vi.fn(), warning: vi.fn() };
  const result = await render(EstimatesPageComponent, {
    providers: [
      {
        provide: IdService,
        useValue: {
          create: async () => "00000000-0000-4000-8000-000000000099",
        },
      },
      {
        provide: EstimateRecoveryService,
        useValue: {
          getAll: async () => [],
          save: async () => undefined,
          remove: async () => undefined,
        },
      },
      { provide: EstimatesService, useValue: estimates },
      { provide: EstimatePdfService, useValue: pdf },
      { provide: CustomersService, useValue: customers },
      { provide: Dialogs, useValue: { confirm } },
      { provide: NotificationService, useValue: notifications },
    ],
  });
  const vm = result.componentRef.injector.get(EstimatesPageService);
  await vi.waitFor(() => expect(vm.loading()).toBe(false));
  await result.detectChanges();
  return {
    estimates,
    pdf,
    customers,
    confirm,
    notifications,
    vm,
    result,
    user: userEvent.setup(),
  };
}

test("las condiciones se editan en una pantalla propia y volver conserva el borrador", async () => {
  const { user, vm, result } = await setup();
  await user.press(
    screen.getByRole("button", { name: "Ver presupuesto P-001" }),
  );
  await user.press(screen.getByRole("button", { name: "Editar presupuesto" }));
  const before = structuredClone(vm.form().items);
  await user.press(
    screen.getByRole("button", { name: "Vigencia y condiciones" }),
  );
  expect(vm.title()).toBe("Vigencia y condiciones");
  expect(vm.viewKey()).toBe("form:conditions");
  expect(screen.queryByLabelText("Descripción del trabajo *")).toBeNull();
  await fireEvent.changeText(
    screen.getByLabelText("Notas y condiciones"),
    "Coordinar la visita antes de comenzar.",
  );
  await vi.waitFor(() => expect(vm.saveState()).toBe("saved"));
  await user.press(
    screen.getByRole("button", { name: "Volver al presupuesto" }),
  );
  await vi.waitFor(() => expect(vm.editingConditions()).toBe(false));
  await result.detectChanges();
  expect(vm.form().notes).toBe("Coordinar la visita antes de comenzar.");
  expect(vm.form().items).toEqual(before);
  expect(screen.queryByLabelText("Notas y condiciones")).toBeNull();
  expect(
    screen.getByRole("button", { name: "Vigencia y condiciones" }),
  ).toBeTruthy();
});

test("un fallo al guardar condiciones impide salir silenciosamente y permite reintentar", async () => {
  const { user, vm, result } = await setup();
  await user.press(
    screen.getByRole("button", { name: "Ver presupuesto P-001" }),
  );
  await user.press(screen.getByRole("button", { name: "Editar presupuesto" }));
  await user.press(
    screen.getByRole("button", { name: "Vigencia y condiciones" }),
  );
  const recovery = result.componentRef.injector.get(EstimateRecoveryService);
  const save = vi
    .spyOn(recovery, "save")
    .mockRejectedValue(new Error("Disco lleno"));
  await fireEvent.changeText(
    screen.getByLabelText("Notas y condiciones"),
    "Trabajo escrito sin perder.",
  );
  await vi.waitFor(() => expect(vm.saveState()).toBe("failed"));
  await vm.back();
  expect(vm.editingConditions()).toBe(true);
  expect(vm.form().notes).toBe("Trabajo escrito sin perder.");
  save.mockResolvedValue(undefined);
  await vm.retrySave();
  await vm.back();
  expect(vm.editingConditions()).toBe(false);
});

test("muestra una lista legible y abre el detalle con totales y datos del cliente", async () => {
  const { user } = await setup();
  expect(screen.getByText("$ 2.501,00")).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Eliminar borrador" }),
  ).toBeNull();
  await user.press(
    screen.getByRole("button", { name: "Ver presupuesto P-001" }),
  );
  expect(screen.getByText("Pintura blanca")).toBeTruthy();
  expect(screen.getByText("Incluye limpieza")).toBeTruthy();
  expect(screen.getByText("Departamento: B")).toBeTruthy();
  await user.press(
    screen.getByRole("button", { name: "Volver a presupuestos" }),
  );
  expect(
    screen.getByRole("button", { name: "Agregar presupuesto" }),
  ).toBeTruthy();
});
test("crea un presupuesto en USD con cantidad decimal y precio convertido a centavos", async () => {
  const { user, estimates } = await setup(null);
  await user.press(screen.getByRole("button", { name: "Agregar presupuesto" }));
  await user.type(screen.getByLabelText("Número de presupuesto *"), "P-002");
  await user.press(screen.getByRole("button", { name: "Elegir cliente" }));
  await user.press(
    screen.getByRole("button", { name: "Seleccionar cliente Ana García" }),
  );
  await user.press(screen.getByRole("button", { name: "Usar dirección Casa" }));
  await user.type(
    screen.getByLabelText("Descripción del trabajo *"),
    "Pintura",
  );
  await user.press(screen.getByRole("button", { name: "Moneda USD" }));
  await user.press(screen.getByRole("button", { name: "Agregar material" }));
  await user.type(screen.getByLabelText("Material *"), "Pintura blanca");
  await fireEvent.changeText(screen.getByLabelText("Cantidad *"), "1,5");
  await fireEvent.changeText(
    screen.getByLabelText("Precio por unidad *"),
    "10,25",
  );
  await user.press(screen.getByRole("button", { name: "Agregar" }));
  expect(screen.getByText(/Total ·\s*US\$ 15,38/)).toBeTruthy();
  await user.press(screen.getByRole("button", { name: "Revisar presupuesto" }));
  expect(estimates.create).toHaveBeenCalledWith(
    expect.objectContaining({
      number: "P-002",
      clientId: customerFixture.id,
      addressId: customerFixture.addresses[0].id,
      currency: Currency.USD,
      items: [expect.objectContaining({ quantity: 1.5, unitPriceCents: 1025 })],
    }),
    "00000000-0000-4000-8000-000000000099",
  );
});
test("permite comenzar sin clientes y conserva el trabajo incompleto", async () => {
  const { user, vm } = await setup(null, false);
  await user.press(screen.getByRole("button", { name: "Agregar presupuesto" }));
  expect(screen.getByLabelText("Número de presupuesto *")).toBeTruthy();
  await fireEvent.changeText(
    screen.getByLabelText("Descripción del trabajo *"),
    "Trabajo pendiente",
  );
  await vi.waitFor(() => expect(vm.saveState()).toBe("saved"));
  expect(vm.recoveries()[0].form.description).toBe("Trabajo pendiente");
});
test("editar conserva los identificadores de ítems y delega la actualización", async () => {
  const { user, estimates } = await setup();
  await user.press(
    screen.getByRole("button", { name: "Ver presupuesto P-001" }),
  );
  await user.press(screen.getByRole("button", { name: "Editar presupuesto" }));
  await fireEvent.changeText(
    screen.getByLabelText("Descripción del trabajo *"),
    "Cocina y baño",
  );
  await user.press(screen.getByRole("button", { name: "Revisar presupuesto" }));
  expect(estimates.update).toHaveBeenCalledWith(
    estimateFixture.id,
    expect.objectContaining({
      description: "Cocina y baño",
      items: [
        expect.objectContaining({
          id: estimateFixture.items[0].id,
          unitPriceCents: 125050,
        }),
      ],
    }),
  );
});
test("rechaza importes ambiguos y cancelar conserva el material anterior", async () => {
  const { user, estimates, vm } = await setup();
  await user.press(
    screen.getByRole("button", { name: "Ver presupuesto P-001" }),
  );
  await user.press(screen.getByRole("button", { name: "Editar presupuesto" }));
  await user.press(
    screen.getByRole("button", { name: "Editar Pintura blanca" }),
  );
  await fireEvent.changeText(
    screen.getByLabelText("Precio por unidad *"),
    "1.250,50",
  );
  await user.press(screen.getByRole("button", { name: "Guardar cambios" }));
  expect(estimates.update).not.toHaveBeenCalled();
  expect(screen.getByDisplayValue("1.250,50")).toBeTruthy();
  expect(vm.editorError()).toContain("precio válido");
  await user.press(screen.getByRole("button", { name: "Cancelar" }));
  expect(vm.form().items[0].price).toBe("1250,50");
});
test("cancelar eliminación conserva el borrador y confirmar lo elimina", async () => {
  const { user, estimates, confirm } = await setup();
  await user.press(
    screen.getByRole("button", { name: "Ver presupuesto P-001" }),
  );
  confirm.mockResolvedValueOnce(false);
  await user.press(screen.getByRole("button", { name: "Eliminar borrador" }));
  expect(estimates.deleteDraft).not.toHaveBeenCalled();
  await user.press(screen.getByRole("button", { name: "Eliminar borrador" }));
  expect(estimates.deleteDraft).toHaveBeenCalledWith(estimateFixture.id);
  expect(
    screen.queryByRole("button", { name: "Ver presupuesto P-001" }),
  ).toBeNull();
});
test("presupuestos emitidos no muestran acciones de editar o eliminar", async () => {
  const { user, estimates } = await setup({
    ...estimateFixture,
    status: EstimateStatus.Sent,
  });
  await user.press(
    screen.getByRole("button", { name: "Ver presupuesto P-001" }),
  );
  expect(
    screen.queryByRole("button", { name: "Editar presupuesto" }),
  ).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Eliminar borrador" }),
  ).toBeNull();
  await user.press(
    screen.getByRole("button", { name: "Marcar como Aceptado" }),
  );
  expect(estimates.setStatus).toHaveBeenCalledWith(
    estimateFixture.id,
    EstimateStatus.Accepted,
  );
});
test("marcar como enviado confirma el bloqueo de edición y actualiza las acciones", async () => {
  const { user, estimates, confirm } = await setup();
  await user.press(
    screen.getByRole("button", { name: "Ver presupuesto P-001" }),
  );
  await user.press(screen.getByRole("button", { name: "Marcar como Enviado" }));
  expect(confirm).toHaveBeenCalledWith(
    "¿Marcar como enviado?",
    expect.objectContaining({ message: expect.stringContaining("no envía") }),
  );
  expect(estimates.setStatus).toHaveBeenCalledWith(
    estimateFixture.id,
    EstimateStatus.Sent,
  );
  expect(
    screen.queryByRole("button", { name: "Editar presupuesto" }),
  ).toBeNull();
});

test("compartir el PDF delega la copia guardada sin marcar el presupuesto como enviado", async () => {
  const { user, pdf, estimates, notifications } = await setup();
  await user.press(
    screen.getByRole("button", { name: "Ver presupuesto P-001" }),
  );
  await user.press(screen.getByRole("button", { name: "Compartir PDF" }));
  expect(pdf.share).toHaveBeenCalledWith(estimateFixture);
  expect(estimates.setStatus).not.toHaveBeenCalled();
  expect(notifications.success).not.toHaveBeenCalled();
});
test("un error al compartir da feedback y permite reintentar sin perder el detalle", async () => {
  const { user, pdf, notifications, vm } = await setup();
  pdf.share.mockRejectedValueOnce(new Error("Completá Mi negocio."));
  await user.press(
    screen.getByRole("button", { name: "Ver presupuesto P-001" }),
  );
  await user.press(screen.getByRole("button", { name: "Compartir PDF" }));
  expect(notifications.danger).toHaveBeenCalledWith("Completá Mi negocio.");
  expect(vm.screen()).toBe("detail");
  expect(vm.busy()).toBe(false);
  await user.press(screen.getByRole("button", { name: "Compartir PDF" }));
  expect(pdf.share).toHaveBeenCalledTimes(2);
  expect(vm.error()).toBe("");
});
test("mientras se prepara o comparte el PDF bloquea acciones y evita dobles solicitudes", async () => {
  const { user, pdf, vm, result } = await setup();
  let finish!: () => void;
  pdf.share.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  await user.press(
    screen.getByRole("button", { name: "Ver presupuesto P-001" }),
  );
  const pending = vm.sharePdf();
  await result.detectChanges();
  expect(screen.getByText("Preparando…")).toBeTruthy();
  expect(vm.busy()).toBe(true);
  await vm.sharePdf();
  await vm.back();
  expect(pdf.share).toHaveBeenCalledOnce();
  expect(vm.screen()).toBe("detail");
  finish();
  await pending;
  expect(vm.busy()).toBe(false);
});
