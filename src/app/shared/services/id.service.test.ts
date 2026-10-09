import { expect, test, vi } from "vitest";
import { assertUuid, IdService } from "./id.service";
const native = vi.hoisted(() => ({ randomUUID: vi.fn() }));
vi.mock("expo-crypto", () => native);

test("obtiene cada UUID del generador nativo de Expo", async () => {
  native.randomUUID
    .mockReturnValueOnce("d137e65f-3631-4c72-bbd8-a07222787596")
    .mockReturnValueOnce("4232161c-147c-443f-a085-a5316e0cfb14");
  const ids = new IdService();
  expect(await ids.create()).toBe("d137e65f-3631-4c72-bbd8-a07222787596");
  expect(await ids.create()).toBe("4232161c-147c-443f-a085-a5316e0cfb14");
  expect(native.randomUUID).toHaveBeenCalledTimes(2);
});
test.each([
  "d137e65f-3631-4c72-bbd8-a07222787596",
  "D137E65F-3631-4C72-BBD8-A07222787596",
])("acepta el UUID válido %s", (id) => {
  expect(() => assertUuid(id)).not.toThrow();
});
test.each([
  "",
  "123",
  "d137e65f-3631-0c72-bbd8-a07222787596",
  "d137e65f-3631-4c72-0bd8-a07222787596",
])("rechaza el identificador inválido %s", (id) => {
  expect(() => assertUuid(id)).toThrow("UUID inválido");
});
