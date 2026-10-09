import { render, screen, userEvent, fireEvent } from "@ng-native/testing";
import { expect, test, vi } from "vitest";
import { EstimatesListComponent } from "./estimates-list.component";
import { EstimatesDetailComponent } from "./estimates-detail.component";
import { EstimatesFormComponent } from "./estimates-form.component";
import { EstimatesCustomerPickerComponent } from "./estimates-customer-picker.component";
import { EstimateCustomerSelectionComponent } from "./estimate-customer-selection.component";
import { EstimateItemCardComponent } from "./estimate-item-card.component";
import { EstimateItemEditorComponent } from "./estimate-item-editor.component";
import {
  customerFixture,
  estimateFixture,
} from "../../shared/testing/domain-fixtures";
import {
  Currency,
  EstimateStatus,
  EstimateItemType,
  MeasurementUnit,
} from "../models/estimate.model";
import {
  STATUS_LABELS,
  UNIT_OPTIONS,
} from "../services/estimates-page.service";

test("la lista presenta el total entregado y emite el presupuesto seleccionado", async () => {
  const opened = vi.fn();
  await render(EstimatesListComponent, {
    inputs: {
      rows: [{ estimate: estimateFixture, totalCents: 250100 }],
      statusLabels: STATUS_LABELS,
    },
    on: { opened },
  });
  expect(screen.getByText("$ 2.501,00")).toBeTruthy();
  await userEvent.press(
    screen.getByRole("button", { name: "Ver presupuesto P-001" }),
  );
  expect(opened).toHaveBeenCalledWith(estimateFixture);
});
test("el detalle respeta estados y emite cambios sin ejecutar persistencia", async () => {
  const statusChanged = vi.fn();
  await render(EstimatesDetailComponent, {
    inputs: {
      estimate: { ...estimateFixture, status: EstimateStatus.Sent },
      total: 250100,
      items: [],
      statusLabels: STATUS_LABELS,
      nextStatuses: [EstimateStatus.Accepted],
    },
    on: { statusChanged },
  });
  expect(
    screen.queryByRole("button", { name: "Editar presupuesto" }),
  ).toBeNull();
  await userEvent.press(
    screen.getByRole("button", { name: "Marcar como Aceptado" }),
  );
  expect(statusChanged).toHaveBeenCalledWith(EstimateStatus.Accepted);
});
test("la tarjeta de ítem presenta el subtotal calculado por el servicio sin recalcularlo", async () => {
  await render(EstimateItemCardComponent, {
    inputs: {
      row: {
        item: estimateFixture.items[0],
        subtotalCents: 444,
        unitLabel: "Litros",
      },
      currency: Currency.USD,
    },
  });
  expect(screen.getByText("US$ 4,44")).toBeTruthy();
});
test("el editor de ítem emite el precio como texto y delega la eliminación", async () => {
  const changed = vi.fn();
  const removed = vi.fn();
  const item = {
    description: "Pintura",
    quantity: "1",
    price: "10",
    type: EstimateItemType.Material,
    unit: MeasurementUnit.Unit,
  };
  await render(EstimateItemEditorComponent, {
    inputs: {
      item,
      index: 0,
      currency: Currency.ARS,
      units: UNIT_OPTIONS,
      itemTypes: [{ value: EstimateItemType.Material, label: "Material" }],
    },
    on: { changed, removed },
  });
  await fireEvent.changeText(
    screen.getByLabelText("Precio unitario del ítem 1"),
    "10,25",
  );
  expect(changed).toHaveBeenCalledWith({ price: "10,25" });
  expect(item.price).toBe("10");
  await userEvent.press(screen.getByRole("button", { name: "Quitar ítem 1" }));
  expect(removed).toHaveBeenCalledOnce();
});
test("selección de cliente y dirección sólo emite las intenciones del usuario", async () => {
  const choose = vi.fn();
  const addressChanged = vi.fn();
  await render(EstimateCustomerSelectionComponent, {
    inputs: { customer: customerFixture },
    on: { choose, addressChanged },
  });
  await userEvent.press(screen.getByRole("button", { name: "Elegir cliente" }));
  expect(choose).toHaveBeenCalledOnce();
  await userEvent.press(
    screen.getByRole("button", { name: "Usar dirección Casa" }),
  );
  expect(addressChanged).toHaveBeenCalledWith(customerFixture.addresses[0].id);
});
test("el selector recibe clientes filtrados y comunica la selección", async () => {
  const selected = vi.fn();
  await render(EstimatesCustomerPickerComponent, {
    inputs: { customers: [customerFixture] },
    on: { selected },
  });
  await userEvent.press(
    screen.getByRole("button", { name: "Seleccionar cliente Ana García" }),
  );
  expect(selected).toHaveBeenCalledWith(customerFixture);
});
test("el formulario de presupuesto comunica cambios de moneda y muestra el total recibido", async () => {
  const changed = vi.fn();
  const itemAdded = vi.fn();
  const form = {
    number: "",
    clientId: "",
    addressId: "",
    description: "",
    currency: Currency.ARS,
    validUntil: "",
    notes: "",
    items: [],
  };
  await render(EstimatesFormComponent, {
    inputs: {
      form,
      preview: { total: 12345, subtotals: [], error: "" },
      currencies: [Currency.ARS, Currency.USD],
      units: UNIT_OPTIONS,
      itemTypes: [],
    },
    on: { changed, itemAdded },
  });
  expect(screen.getByText("Total: $ 123,45")).toBeTruthy();
  await userEvent.press(screen.getByRole("button", { name: "Moneda USD" }));
  expect(changed).toHaveBeenCalledWith({ currency: Currency.USD });
  expect(form.currency).toBe(Currency.ARS);
  await userEvent.press(screen.getByRole("button", { name: "Agregar ítem" }));
  expect(itemAdded).toHaveBeenCalledOnce();
});
