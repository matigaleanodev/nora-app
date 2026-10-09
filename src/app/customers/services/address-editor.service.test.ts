import { expect, test } from "vitest";
import { AddressEditorService } from "./address-editor.service";
import { customerFixture } from "../../shared/testing/domain-fixtures";

test("cancelar conserva la dirección original sin aplicar el borrador", () => {
  const service = new AddressEditorService();
  const original = customerFixture.addresses[0];
  service.open(original, 0);
  service.update({ name: "Otro lugar" });
  expect(original.name).not.toBe("Otro lugar");
  service.cancel();
  expect(service.draft()).toBeNull();
});
test("confirmar una edición conserva UUID e índice y aplica los cambios", () => {
  const service = new AddressEditorService();
  const original = customerFixture.addresses[0];
  service.open(original, 2);
  service.update({ streetNumber: "456" });
  expect(service.confirm()).toEqual({
    index: 2,
    address: { ...original, streetNumber: "456" },
  });
  expect(service.draft()).toBeNull();
});
test("rechaza una dirección sin nombre y permite corregirla sin perder campos", () => {
  const service = new AddressEditorService();
  service.open();
  service.update({ street: "San Martín" });
  expect(service.confirm()).toBeNull();
  expect(service.error()).toBe("Ingresá un nombre para la dirección.");
  service.update({ name: " Casa " });
  expect(service.confirm()).toMatchObject({
    index: null,
    address: { name: "Casa", street: "San Martín" },
  });
});
