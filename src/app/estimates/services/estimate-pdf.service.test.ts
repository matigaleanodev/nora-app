import { injectService } from "@ng-native/testing";
import { beforeEach, expect, test, vi } from "vitest";
import { EstimatePdfService } from "./estimate-pdf.service";
import { BusinessProfileService } from "../../business/services/business-profile.service";
import { IdService } from "../../shared/services/id.service";
import { estimateFixture } from "../../shared/testing/domain-fixtures";
import type { BusinessProfile } from "../../business/models/business-profile.model";
const native = vi.hoisted(() => ({
  build: vi.fn(),
  share: vi.fn(),
  available: vi.fn(),
  download: vi.fn(),
  writeFails: false,
  incomplete: false,
  files: new Map<string, { bytes: Uint8Array; modified: number | null }>(),
}));
vi.mock("../utils/estimate-pdf-document", () => ({
  buildEstimatePdf: native.build,
}));
vi.mock("expo-sharing", () => ({
  shareAsync: native.share,
  isAvailableAsync: native.available,
}));
vi.mock("expo-asset", () => ({
  Asset: {
    fromModule: () => ({
      localUri: "file:///assets/font.ttf",
      downloadAsync: native.download,
    }),
  },
}));
vi.mock("../../../../assets/NotoSans.ttf", () => ({ default: 1 }));
vi.mock("expo-file-system", () => {
  const uri = (base: string | { uri: string }, name?: string) =>
    (typeof base === "string" ? base : base.uri).replace(/\/$/, "") +
    (name ? "/" + name : "");
  class Directory {
    readonly uri: string;
    constructor(base: string | { uri: string }, name?: string) {
      this.uri = uri(base, name) + "/";
    }
    create() {}
    list() {
      return [...native.files.keys()]
        .filter((path) => path.startsWith(this.uri))
        .map((path) => new File(path));
    }
  }
  class File {
    readonly uri: string;
    constructor(base: string | { uri: string }, name?: string) {
      this.uri = uri(base, name);
    }
    get exists() {
      return native.files.has(this.uri);
    }
    get size() {
      return native.files.get(this.uri)?.bytes.length ?? 0;
    }
    get modificationTime() {
      return native.files.get(this.uri)?.modified ?? null;
    }
    get name() {
      return this.uri.slice(this.uri.lastIndexOf("/") + 1);
    }
    get parentDirectory() {
      return { uri: this.uri.slice(0, this.uri.lastIndexOf("/") + 1) };
    }
    async bytes() {
      return native.files.get(this.uri)?.bytes ?? new Uint8Array([1]);
    }
    write(bytes: Uint8Array) {
      native.files.set(this.uri, {
        bytes: native.incomplete ? bytes.slice(0, 2) : bytes,
        modified: Date.now(),
      });
      if (native.writeFails) throw new Error("Escritura fallida.");
    }
    delete() {
      native.files.delete(this.uri);
    }
  }
  return {
    File,
    Directory,
    Paths: {
      cache: { uri: "file:///cache/" },
      document: { uri: "file:///documents/" },
    },
  };
});
const profile: BusinessProfile = {
  displayName: "Electricidad Juan",
  updatedAt: "2026-10-16T12:00:00Z",
};
const target = "file:///cache/estimate-pdfs/Presupuesto-P-001-123.pdf";
const bytes = new Uint8Array([37, 80, 68, 70, 45, 49, 55]);
function setup(value: BusinessProfile | null = profile) {
  return injectService(EstimatePdfService, {
    providers: [
      { provide: BusinessProfileService, useValue: { get: async () => value } },
      { provide: IdService, useValue: { create: async () => "123" } },
    ],
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  native.files.clear();
  native.writeFails = false;
  native.incomplete = false;
  native.build.mockResolvedValue(bytes);
  native.available.mockResolvedValue(true);
  native.share.mockResolvedValue(undefined);
  native.download.mockResolvedValue(undefined);
});
test("requiere el prestador y la disponibilidad nativa antes de generar", async () => {
  await expect(setup(null).share(estimateFixture)).rejects.toThrow(
    "Mi negocio",
  );
  native.available.mockResolvedValue(false);
  await expect(setup().share(estimateFixture)).rejects.toThrow("dispositivo");
  expect(native.build).not.toHaveBeenCalled();
});
test("escribe bytes PDF verificados antes de compartir y conserva el documento", async () => {
  const original = structuredClone(estimateFixture);
  await setup().share(estimateFixture);
  expect(native.build).toHaveBeenCalledWith(
    estimateFixture,
    profile,
    expect.any(Uint8Array),
    undefined,
  );
  expect(native.files.get(target)?.bytes).toEqual(bytes);
  expect(native.share).toHaveBeenCalledWith(
    target,
    expect.objectContaining({ mimeType: "application/pdf" }),
  );
  expect(estimateFixture).toEqual(original);
});
test.each([new Uint8Array(), new Uint8Array([1, 2, 3, 4, 5, 6])])(
  "rechaza un resultado vacío o que no sea PDF",
  async (result) => {
    native.build.mockResolvedValue(result);
    await expect(setup().share(estimateFixture)).rejects.toThrow(
      "generar el PDF",
    );
    expect(native.share).not.toHaveBeenCalled();
  },
);
test.each(["writeFails", "incomplete"] as const)(
  "elimina escrituras parciales y no comparte: %s",
  async (failure) => {
    native[failure] = true;
    await expect(setup().share(estimateFixture)).rejects.toThrow();
    expect(native.files.has(target)).toBe(false);
    expect(native.share).not.toHaveBeenCalled();
  },
);
test("conserva la copia si falla compartir y permite reintentar", async () => {
  native.share.mockRejectedValueOnce(new Error("Selector no disponible"));
  const service = setup();
  await expect(service.share(estimateFixture)).rejects.toThrow("Selector");
  expect(native.files.has(target)).toBe(true);
  await expect(service.share(estimateFixture)).resolves.toBeUndefined();
  expect(native.download).toHaveBeenCalledOnce();
});
test("incluye el logo privado sin leer archivos ajenos", async () => {
  const uri = "file:///documents/business-logos/logo.png";
  native.files.set(uri, {
    bytes: new Uint8Array([1, 2, 3]),
    modified: Date.now(),
  });
  await setup({ ...profile, logo: { uri, mimeType: "image/png" } }).share(
    estimateFixture,
  );
  expect(native.build.mock.calls[0][3]).toEqual({
    bytes: new Uint8Array([1, 2, 3]),
    mimeType: "image/png",
  });
  await expect(
    setup({
      ...profile,
      logo: { uri: "file:///private.png", mimeType: "image/png" },
    }).share(estimateFixture),
  ).rejects.toThrow("logo");
  expect(native.files.has(uri)).toBe(true);
});
test("limpia sólo PDFs vencidos de su caché", async () => {
  const old = "file:///cache/estimate-pdfs/old.pdf";
  const other = "file:///cache/estimate-pdfs/data.json";
  const recent = "file:///cache/estimate-pdfs/recent.pdf";
  for (const uri of [old, other])
    native.files.set(uri, { bytes, modified: Date.now() - 2 * 86400000 });
  native.files.set(recent, { bytes, modified: Date.now() });
  await setup().share(estimateFixture);
  expect(native.files.has(old)).toBe(false);
  expect(native.files.has(other)).toBe(true);
  expect(native.files.has(recent)).toBe(true);
});
test("un número visible no puede salir del directorio de PDFs", async () => {
  await setup().share({ ...estimateFixture, number: "../../Juan/.." });
  expect(native.share.mock.calls[0][0]).toBe(
    "file:///cache/estimate-pdfs/Presupuesto-Juan-123.pdf",
  );
});
