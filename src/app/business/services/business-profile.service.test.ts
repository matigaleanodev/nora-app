import { injectService } from "@ng-native/testing";
import { expect, test, vi } from "vitest";
import {
  BusinessProfileService,
  BUSINESS_PROFILE_KEY,
} from "./business-profile.service";
import { BusinessLogoService } from "./business-logo.service";
import { LocalStorageService } from "../../core/storage/local-storage.service";
import type {
  BusinessForm,
  BusinessProfile,
  BusinessLogo,
} from "../models/business-profile.model";
const form: BusinessForm = {
  displayName: " Juan Pérez ",
  areaCode: "376",
  phoneNumber: "4123456",
  whatsapp: true,
  email: " juan@example.com ",
};
const picked: BusinessLogo = {
  uri: "file:///cache/logo.png",
  mimeType: "image/png",
};
const copied: BusinessLogo = {
  ...picked,
  uri: "file:///documents/business-logos/id.png",
};
function setup(previous: BusinessProfile | null = null) {
  let state = previous;
  const storage = {
    read: vi.fn(async () => state),
    write: vi.fn(async (_key: string, value: BusinessProfile) => {
      state = value;
    }),
  };
  const logos = {
    persist: vi.fn().mockResolvedValue(copied),
    removeOwned: vi.fn().mockResolvedValue(undefined),
  };
  const service = injectService(BusinessProfileService, {
    providers: [
      { provide: LocalStorageService, useValue: storage },
      { provide: BusinessLogoService, useValue: logos },
    ],
  });
  return { service, storage, logos };
}
test("normaliza y conserva nombre, contacto argentino y fecha de actualización", async () => {
  const { service, storage } = setup();
  const saved = await service.save(form);
  expect(saved).toMatchObject({
    displayName: "Juan Pérez",
    email: "juan@example.com",
    phone: { areaCode: "376", number: "4123456", whatsapp: true },
  });
  expect(saved.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(storage.write).toHaveBeenCalledWith(BUSINESS_PROFILE_KEY, saved);
  expect(await service.get()).toEqual(saved);
});
test("permite guardar sólo el nombre sin inventar datos de contacto", async () => {
  const { service } = setup();
  const saved = await service.save({
    ...form,
    email: "",
    areaCode: "",
    phoneNumber: "",
  });
  expect(saved.email).toBeUndefined();
  expect(saved.phone).toBeUndefined();
  expect(saved.logo).toBeUndefined();
});
test.each([
  { displayName: " " },
  { email: "sin-arroba" },
  { areaCode: "0376" },
  { phoneNumber: "" },
])(
  "rechaza datos inválidos antes de copiar el logo o escribir",
  async (changes) => {
    const { service, storage, logos } = setup();
    await expect(
      service.save({ ...form, ...changes, logo: picked }),
    ).rejects.toThrow();
    expect(storage.write).not.toHaveBeenCalled();
    expect(logos.persist).not.toHaveBeenCalled();
  },
);
test("copia un logo nuevo y borra el anterior después del guardado correcto", async () => {
  const old: BusinessLogo = {
    ...copied,
    uri: "file:///documents/business-logos/old.png",
  };
  const { service, storage, logos } = setup({
    displayName: "Anterior",
    logo: old,
    updatedAt: "2026-10-09T00:00:00Z",
  });
  expect((await service.save({ ...form, logo: picked })).logo).toEqual(copied);
  expect(logos.persist).toHaveBeenCalledWith(picked);
  expect(logos.removeOwned).toHaveBeenCalledWith(old);
  expect(storage.write.mock.invocationCallOrder[0]).toBeLessThan(
    logos.removeOwned.mock.invocationCallOrder[0],
  );
});
test("si falla SQLite limpia sólo la copia nueva y conserva el logo anterior", async () => {
  const { service, storage, logos } = setup({
    displayName: "Anterior",
    logo: copied,
    updatedAt: "2026-10-09T00:00:00Z",
  });
  storage.write.mockRejectedValueOnce(new Error("disco"));
  await expect(service.save({ ...form, logo: picked })).rejects.toThrow(
    "disco",
  );
  expect(logos.removeOwned).toHaveBeenCalledExactlyOnceWith(copied);
  expect((await service.get())?.displayName).toBe("Anterior");
});
test("reutiliza el logo guardado y permite quitarlo sin copiarlo otra vez", async () => {
  const { service, logos } = setup({
    displayName: "Anterior",
    logo: copied,
    updatedAt: "2026-10-09T00:00:00Z",
  });
  await service.save({ ...form, logo: copied });
  expect(logos.persist).not.toHaveBeenCalled();
  expect(logos.removeOwned).not.toHaveBeenCalled();
  await service.save(form);
  expect(logos.removeOwned).toHaveBeenCalledWith(copied);
});
test("serializa los guardados y una operación fallida no bloquea la siguiente", async () => {
  const { service, storage } = setup();
  storage.write.mockRejectedValueOnce(new Error("disco"));
  const first = service.save(form);
  const second = service.save({ ...form, displayName: "Segundo" });
  await expect(first).rejects.toThrow("disco");
  await expect(second).resolves.toMatchObject({ displayName: "Segundo" });
  expect((await service.get())?.displayName).toBe("Segundo");
});
