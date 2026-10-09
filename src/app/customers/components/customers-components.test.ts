import { render, screen, fireEvent, userEvent } from "@ng-native/testing";
import { expect, test, vi } from "vitest";
import { CustomersListComponent } from "./customers-list.component";
import { CustomersDetailComponent } from "./customers-detail.component";
import { CustomersFormComponent } from "./customers-form.component";
import { CustomerAddressEditorComponent } from "./customer-address-editor.component";
import { CustomerAddressCardComponent } from "./customer-address-card.component";
import { customerFixture } from "../../shared/testing/domain-fixtures";

test("la lista comunica selección y búsqueda sin modificar la colección recibida", async () => {
  const opened = vi.fn();
  const searchChange = vi.fn();
  const customers = [customerFixture];
  await render(CustomersListComponent, {
    inputs: { customers },
    on: { opened, searchChange },
  });
  await fireEvent.changeText(screen.getByLabelText("Buscar clientes"), "Ana");
  await userEvent.press(
    screen.getByRole("button", { name: "Ver cliente Ana García" }),
  );
  expect(searchChange).toHaveBeenCalledWith("Ana");
  expect(opened).toHaveBeenCalledWith(customerFixture);
  expect(customers).toEqual([customerFixture]);
});
test("el detalle delega editar y archivar y reutiliza la dirección completa", async () => {
  const edit = vi.fn();
  const archive = vi.fn();
  await render(CustomersDetailComponent, {
    inputs: { customer: customerFixture },
    on: { edit, archive },
  });
  expect(screen.getByText("Departamento: B")).toBeTruthy();
  await userEvent.press(screen.getByRole("button", { name: "Editar cliente" }));
  await userEvent.press(
    screen.getByRole("button", { name: "Archivar cliente" }),
  );
  expect(edit).toHaveBeenCalledOnce();
  expect(archive).toHaveBeenCalledOnce();
});
test("el formulario emite cambios y acciones de dirección sin mutar sus inputs", async () => {
  const changed = vi.fn();
  const addressAdded = vi.fn();
  const form = {
    name: "Ana",
    areaCode: "",
    phoneNumber: "",
    whatsapp: true,
    email: "",
    notes: "",
    addresses: [],
  };
  await render(CustomersFormComponent, {
    inputs: { form },
    on: { changed, addressAdded },
  });
  await fireEvent.changeText(screen.getByLabelText("Nombre *"), "Ana López");
  await userEvent.press(
    screen.getByRole("button", { name: "Agregar dirección" }),
  );
  expect(changed).toHaveBeenCalledWith({ name: "Ana López" });
  expect(form.name).toBe("Ana");
  expect(addressAdded).not.toHaveBeenCalled();
  await fireEvent.changeText(
    screen.getByLabelText("Nombre de dirección *"),
    "Casa",
  );
  await userEvent.press(
    screen.getByRole("button", { name: "Guardar dirección" }),
  );
  expect(addressAdded).toHaveBeenCalledWith(
    expect.objectContaining({ name: "Casa" }),
  );
});
test("el editor de dirección emite campos y eliminación sin reemplazar el UUID", async () => {
  const changed = vi.fn();
  const removed = vi.fn();
  const address = customerFixture.addresses[0];
  await render(CustomerAddressEditorComponent, {
    inputs: { address, index: 0 },
    on: { changed, removed },
  });
  await fireEvent.changeText(screen.getByLabelText("Altura"), "456");
  await userEvent.press(
    screen.getByRole("button", { name: "Quitar dirección 1" }),
  );
  expect(changed).toHaveBeenCalledWith({ streetNumber: "456" });
  expect(removed).toHaveBeenCalledOnce();
  expect(address.streetNumber).toBe("123");
});
test("la tarjeta de dirección admite piso y departamento opcionales", async () => {
  await render(CustomerAddressCardComponent, {
    inputs: {
      address: {
        ...customerFixture.addresses[0],
        floor: undefined,
        apartment: undefined,
      },
    },
  });
  expect(screen.getByText("San Martín 123")).toBeTruthy();
  expect(screen.queryByText(/Departamento:/)).toBeNull();
  expect(screen.queryByText(/Piso:/)).toBeNull();
});
