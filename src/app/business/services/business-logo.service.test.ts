import { injectService } from "@ng-native/testing";
import { beforeEach, expect, test, vi } from "vitest";
import { BusinessLogoService } from "./business-logo.service";
import { IdService } from "../../shared/services/id.service";
const native = vi.hoisted(() => ({
  pick: vi.fn(),
  files: new Map<string, number>(),
  copyFails: false,
  deleted: vi.fn(),
  created: vi.fn(),
}));
vi.mock("expo-image-picker", () => ({ launchImageLibraryAsync: native.pick }));
vi.mock("expo-file-system", () => {
  class Directory {
    readonly uri: string;
    constructor(base: string | { uri: string }, name: string) {
      this.uri =
        (typeof base === "string" ? base : base.uri).replace(/\/$/, "") +
        "/" +
        name +
        "/";
    }
    create(options: unknown) {
      native.created(options);
    }
  }
  class File {
    readonly uri: string;
    constructor(base: string | { uri: string }, name?: string) {
      this.uri = (typeof base === "string" ? base : base.uri) + (name ?? "");
    }
    get exists() {
      return native.files.has(this.uri);
    }
    get size() {
      return native.files.get(this.uri) ?? 0;
    }
    get parentDirectory() {
      return { uri: this.uri.slice(0, this.uri.lastIndexOf("/") + 1) };
    }
    copy(target: File) {
      native.files.set(target.uri, this.size);
      if (native.copyFails) throw new Error("copia fallida");
    }
    delete() {
      native.deleted(this.uri);
      native.files.delete(this.uri);
    }
  }
  return {
    Directory,
    File,
    Paths: { document: { uri: "file:///documents/" } },
  };
});
beforeEach(() => {
  vi.clearAllMocks();
  native.files.clear();
  native.copyFails = false;
});
function setup() {
  return injectService(BusinessLogoService, {
    providers: [
      {
        provide: IdService,
        useValue: { create: vi.fn().mockResolvedValue("id") },
      },
    ],
  });
}
const logo = { uri: "file:///cache/logo.png", mimeType: "image/png" } as const;
test("cancelar la galería no copia archivos ni pide permisos de cámara", async () => {
  native.pick.mockResolvedValue({ canceled: true, assets: null });
  expect(await setup().pick()).toBeNull();
  expect(native.created).not.toHaveBeenCalled();
  expect(native.pick).toHaveBeenCalledWith(
    expect.objectContaining({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
    }),
  );
});
test("rechaza imágenes no soportadas y archivos mayores a cinco MB", async () => {
  native.pick.mockResolvedValueOnce({
    canceled: false,
    assets: [{ uri: logo.uri, mimeType: "image/heic" }],
  });
  const service = setup();
  await expect(service.pick()).rejects.toThrow("JPG, PNG o WebP");
  native.pick.mockResolvedValueOnce({
    canceled: false,
    assets: [{ ...logo, fileSize: 6 * 1024 * 1024 }],
  });
  await expect(service.pick()).rejects.toThrow("5 MB");
});
test("copia el logo al directorio durable y conserva el archivo original", async () => {
  native.files.set(logo.uri, 100);
  const saved = await setup().persist(logo);
  expect(saved.uri).toBe("file:///documents/business-logos/id.png");
  expect(native.files.has(logo.uri)).toBe(true);
  expect(native.files.has(saved.uri)).toBe(true);
});
test("la limpieza sólo borra archivos de la carpeta propia de logos", async () => {
  const service = setup();
  native.files.set(logo.uri, 100);
  await service.removeOwned(logo);
  expect(native.deleted).not.toHaveBeenCalled();
  const saved = await service.persist(logo);
  await service.removeOwned(saved);
  expect(native.files.has(saved.uri)).toBe(false);
  expect(native.files.has(logo.uri)).toBe(true);
});
test("una copia interrumpida elimina el archivo parcial y conserva el origen", async () => {
  native.files.set(logo.uri, 100);
  native.copyFails = true;
  await expect(setup().persist(logo)).rejects.toThrow("copia fallida");
  expect(native.files.has("file:///documents/business-logos/id.png")).toBe(
    false,
  );
  expect(native.files.has(logo.uri)).toBe(true);
});
test("no persiste archivos vacíos ni referencias temporales que ya no existen", async () => {
  await expect(setup().persist(logo)).rejects.toThrow("Volvé a elegirlo");
  expect(native.created).not.toHaveBeenCalled();
});
