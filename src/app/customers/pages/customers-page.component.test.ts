import { render, screen, userEvent, fireEvent } from "@ng-native/testing";
import { Dialogs, HardwareBack } from "@ng-native/device";
import { expect, test, vi } from "vitest";
import { CustomersPageComponent } from "./customers-page.component";
import { CustomersService } from "../services/customers.service";
import { CustomersPageService } from "../services/customers-page.service";
import { NotificationService } from "../../shared/services/notification.service";
import { customerFixture } from "../../shared/testing/domain-fixtures";

async function setup(empty = false, failLoad = false) {
  const customers = {
    getAll: failLoad
      ? vi.fn().mockRejectedValue(new Error("Lectura fallida"))
      : vi.fn().mockResolvedValue(empty ? [] : [customerFixture]),
    create: vi.fn().mockResolvedValue(customerFixture),
    update: vi.fn().mockResolvedValue(customerFixture),
    setArchived: vi.fn().mockResolvedValue(undefined),
  };
  const confirm = vi.fn().mockResolvedValue(true);
  let hardwareHandler: (() => boolean) | undefined;
  const unsubscribe = vi.fn();
  const hardwareBack = {
    handle: vi.fn((handler: () => boolean) => {
      hardwareHandler = handler;
      return unsubscribe;
    }),
  };
  const notifications = { success: vi.fn(), danger: vi.fn(), warning: vi.fn() };
  const result = await render(CustomersPageComponent, {
    providers: [
      { provide: HardwareBack, useValue: hardwareBack },
      { provide: CustomersService, useValue: customers },
      { provide: Dialogs, useValue: { confirm } },
      { provide: NotificationService, useValue: notifications },
    ],
  });
  const vm = result.componentRef.injector.get(CustomersPageService);
  await vi.waitFor(() => expect(vm.loading()).toBe(false));
  await result.detectChanges();
  return {
    customers,
    confirm,
    notifications,
    vm,
    hardwareHandler: () => hardwareHandler?.(),
    unsubscribe,
    user: userEvent.setup(),
    result,
  };
}

test("muestra nombre y teléfono en la lista, abre detalle completo y vuelve", async () => {
  const { user } = await setup();
  expect(screen.getByText("+5493764123456")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Editar cliente" })).toBeNull();
  await user.press(
    screen.getByRole("button", { name: "Ver cliente Ana García" }),
  );
  expect(screen.getByText("Email: ana@example.com")).toBeTruthy();
  expect(screen.getByText("Departamento: B")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Editar cliente" })).toBeTruthy();
  await user.press(screen.getByRole("button", { name: "Volver a clientes" }));
  expect(screen.getByRole("button", { name: "Agregar cliente" })).toBeTruthy();
});
test("el botón agregar abre el formulario y delega el guardado al servicio", async () => {
  const { user, customers, notifications } = await setup(true);
  await user.press(screen.getByRole("button", { name: "Agregar cliente" }));
  await user.type(screen.getByLabelText("Nombre *"), "Ana García");
  await user.press(screen.getByRole("button", { name: "Agregar dirección" }));
  await user.type(screen.getByLabelText("Nombre de dirección *"), "Casa");
  await user.press(screen.getByRole("button", { name: "Guardar dirección" }));
  await user.press(screen.getByRole("button", { name: "Guardar cliente" }));
  expect(customers.create).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "Ana García",
      addresses: [expect.objectContaining({ name: "Casa" })],
    }),
  );
  expect(notifications.success).toHaveBeenCalledWith("Cliente guardado.");
  expect(screen.getByText("Detalle del cliente")).toBeTruthy();
});
test("editar conserva los UUID y envía los cambios al servicio", async () => {
  const { user, customers } = await setup();
  await user.press(
    screen.getByRole("button", { name: "Ver cliente Ana García" }),
  );
  await user.press(screen.getByRole("button", { name: "Editar cliente" }));
  await fireEvent.changeText(screen.getByLabelText("Nombre *"), "Ana López");
  await user.press(screen.getByRole("button", { name: "Guardar cliente" }));
  expect(customers.update).toHaveBeenCalledWith(
    customerFixture.id,
    expect.objectContaining({
      name: "Ana López",
      addresses: [
        expect.objectContaining({ id: customerFixture.addresses[0].id }),
      ],
    }),
  );
});
test("un fallo de guardado conserva el formulario y muestra feedback", async () => {
  const { user, customers, notifications } = await setup(true);
  customers.create.mockRejectedValueOnce(
    new Error("El nombre es obligatorio."),
  );
  await user.press(screen.getByRole("button", { name: "Agregar cliente" }));
  await user.press(screen.getByRole("button", { name: "Guardar cliente" }));
  expect(screen.getByText("El nombre es obligatorio.")).toBeTruthy();
  expect(screen.getByLabelText("Nombre *")).toBeTruthy();
  expect(notifications.danger).toHaveBeenCalledWith(
    "El nombre es obligatorio.",
  );
});
test("archivar pide confirmación y cancelar no modifica datos", async () => {
  const { user, customers, confirm } = await setup();
  await user.press(
    screen.getByRole("button", { name: "Ver cliente Ana García" }),
  );
  confirm.mockResolvedValueOnce(false);
  await user.press(screen.getByRole("button", { name: "Archivar cliente" }));
  expect(customers.setArchived).not.toHaveBeenCalled();
  await user.press(screen.getByRole("button", { name: "Archivar cliente" }));
  expect(customers.setArchived).toHaveBeenCalledWith(customerFixture.id, true);
  expect(
    screen.queryByRole("button", { name: "Ver cliente Ana García" }),
  ).toBeNull();
  await user.press(
    screen.getByRole("button", { name: "Ver clientes archivados" }),
  );
  await user.press(
    screen.getByRole("button", { name: "Ver cliente Ana García" }),
  );
  await user.press(screen.getByRole("button", { name: "Restaurar cliente" }));
  expect(customers.setArchived).toHaveBeenLastCalledWith(
    customerFixture.id,
    false,
  );
});
test("volver con cambios pide confirmación y permite seguir editando", async () => {
  const { user, confirm, customers } = await setup(true);
  await user.press(screen.getByRole("button", { name: "Agregar cliente" }));
  await user.type(screen.getByLabelText("Nombre *"), "Sin guardar");
  confirm.mockResolvedValueOnce(false);
  await user.press(screen.getByRole("button", { name: "Volver a clientes" }));
  expect(screen.getByDisplayValue("Sin guardar")).toBeTruthy();
  await user.press(screen.getByRole("button", { name: "Volver a clientes" }));
  expect(screen.getByRole("button", { name: "Agregar cliente" })).toBeTruthy();
  expect(customers.create).not.toHaveBeenCalled();
});
test("filtra clientes por búsqueda y permite reintentar una carga fallida", async () => {
  const { customers, result, user } = await setup(false, true);
  expect(screen.getByText("No pudimos cargar los clientes.")).toBeTruthy();
  customers.getAll.mockResolvedValueOnce([customerFixture]);
  await user.press(screen.getByRole("button", { name: "Reintentar clientes" }));
  await result.detectChanges();
  await fireEvent.changeText(
    screen.getByLabelText("Buscar clientes"),
    "No existe",
  );
  expect(
    screen.queryByRole("button", { name: "Ver cliente Ana García" }),
  ).toBeNull();
});

test("el botón Atrás de Android vuelve al listado y libera la suscripción al desmontar", async () => {
  const { user, hardwareHandler, vm, result, unsubscribe } = await setup();
  expect(hardwareHandler()).toBe(false);
  await user.press(
    screen.getByRole("button", { name: "Ver cliente Ana García" }),
  );
  expect(hardwareHandler()).toBe(true);
  await vi.waitFor(() => expect(vm.screen()).toBe("list"));
  await result.detectChanges();
  expect(screen.getByRole("button", { name: "Agregar cliente" })).toBeTruthy();
  result.componentRef.destroy();
  expect(unsubscribe).toHaveBeenCalledTimes(1);
});

test("guarda el email informado por autocompletado nativo al salir del campo", async () => {
  const { user, customers } = await setup(true);
  await user.press(screen.getByRole("button", { name: "Agregar cliente" }));
  await user.type(screen.getByLabelText("Nombre *"), "Ana García");
  await fireEvent(screen.getByLabelText("Email"), "endEditing", {
    text: "ana@gmail.com",
  });
  await user.press(screen.getByRole("button", { name: "Guardar cliente" }));
  expect(customers.create).toHaveBeenCalledWith(
    expect.objectContaining({ email: "ana@gmail.com" }),
  );
});
