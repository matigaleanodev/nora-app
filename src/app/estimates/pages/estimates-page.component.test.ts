import { render, screen, userEvent, fireEvent } from "@ng-native/testing";
import { Dialogs } from "@ng-native/device";
import { expect, test, vi } from "vitest";
import { EstimatesPageComponent } from "./estimates-page.component";
import { EstimatesService } from "../services/estimates.service";
import { EstimatesPageService } from "../services/estimates-page.service";
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
  const confirm = vi.fn().mockResolvedValue(true);
  const notifications = { success: vi.fn(), danger: vi.fn(), warning: vi.fn() };
  const result = await render(EstimatesPageComponent, {
    providers: [
      { provide: EstimatesService, useValue: estimates },
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
    customers,
    confirm,
    notifications,
    vm,
    result,
    user: userEvent.setup(),
  };
}

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
  await user.press(screen.getByRole("button", { name: "Agregar ítem" }));
  await user.type(
    screen.getByLabelText("Descripción del ítem 1"),
    "Pintura blanca",
  );
  await fireEvent.changeText(
    screen.getByLabelText("Cantidad del ítem 1"),
    "1,5",
  );
  await fireEvent.changeText(
    screen.getByLabelText("Precio unitario del ítem 1"),
    "10,25",
  );
  expect(screen.getByText("Total: US$ 15,38")).toBeTruthy();
  await user.press(screen.getByRole("button", { name: "Guardar presupuesto" }));
  expect(estimates.create).toHaveBeenCalledWith(
    expect.objectContaining({
      number: "P-002",
      clientId: customerFixture.id,
      addressId: customerFixture.addresses[0].id,
      currency: Currency.USD,
      items: [expect.objectContaining({ quantity: 1.5, unitPriceCents: 1025 })],
    }),
  );
});
test("advierte si no hay clientes activos y no abre un formulario inválido", async () => {
  const { user, notifications } = await setup(null, false);
  await user.press(screen.getByRole("button", { name: "Agregar presupuesto" }));
  expect(notifications.warning).toHaveBeenCalledWith(
    expect.stringContaining("cliente activo"),
  );
  expect(screen.queryByLabelText("Número de presupuesto *")).toBeNull();
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
  await user.press(screen.getByRole("button", { name: "Guardar presupuesto" }));
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
test("rechaza importes ambiguos sin llamar al dominio y conserva los campos", async () => {
  const { user, estimates, notifications } = await setup();
  await user.press(
    screen.getByRole("button", { name: "Ver presupuesto P-001" }),
  );
  await user.press(screen.getByRole("button", { name: "Editar presupuesto" }));
  await fireEvent.changeText(
    screen.getByLabelText("Precio unitario del ítem 1"),
    "1.250,50",
  );
  await user.press(screen.getByRole("button", { name: "Guardar presupuesto" }));
  expect(estimates.update).not.toHaveBeenCalled();
  expect(screen.getByDisplayValue("1.250,50")).toBeTruthy();
  expect(notifications.danger).toHaveBeenCalled();
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
