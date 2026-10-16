import { injectService } from "@ng-native/testing";
import { beforeEach, expect, test, vi } from "vitest";
import { EstimatePdfService } from "./estimate-pdf.service";
import { BusinessProfileService } from "../../business/services/business-profile.service";
import { IdService } from "../../shared/services/id.service";
import { estimateFixture } from "../../shared/testing/domain-fixtures";
import type { BusinessProfile } from "../../business/models/business-profile.model";

const native = vi.hoisted(() => ({
  print: vi.fn(),
  share: vi.fn(),
  available: vi.fn(),
  deleted: vi.fn(),
  files: new Map<
    string,
    { size: number; modified: number | null; content?: string }
  >(),
  copyFails: false,
  deleteFails: false,
}));
vi.mock("expo-print", () => ({ printToFileAsync: native.print }));
vi.mock("expo-sharing", () => ({
  shareAsync: native.share,
  isAvailableAsync: native.available,
}));
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
      return native.files.get(this.uri)?.size ?? 0;
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
    async base64() {
      return native.files.get(this.uri)?.content ?? "YQ==";
    }
    copy(target: File) {
      native.files.set(target.uri, { size: this.size, modified: Date.now() });
      if (native.copyFails) throw new Error("Copia fallida.");
    }
    delete() {
      if (native.deleteFails) throw new Error("Limpieza fallida.");
      native.deleted(this.uri);
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
  updatedAt: "2026-10-14T12:00:00Z",
};
const generatedUri = "file:///cache/Print/generated.pdf";
const targetUri = "file:///cache/estimate-pdfs/Presupuesto-P-001-123.pdf";
const logoUri = "file:///documents/business-logos/logo.png";
function setup(value: BusinessProfile | null = profile) {
  const get = vi.fn().mockResolvedValue(value);
  return {
    service: injectService(EstimatePdfService, {
      providers: [
        { provide: BusinessProfileService, useValue: { get } },
        {
          provide: IdService,
          useValue: { create: vi.fn().mockResolvedValue("123") },
        },
      ],
    }),
    get,
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  native.files.clear();
  native.copyFails = false;
  native.deleteFails = false;
  native.available.mockResolvedValue(true);
  native.share.mockResolvedValue(undefined);
  native.print.mockImplementation(async () => {
    native.files.set(generatedUri, { size: 1200, modified: Date.now() });
    return { uri: generatedUri, numberOfPages: 1 };
  });
});

test("requiere los datos del prestador antes de generar archivos", async () => {
  await expect(setup(null).service.share(estimateFixture)).rejects.toThrow(
    "Mi negocio",
  );
  expect(native.print).not.toHaveBeenCalled();
  expect(native.share).not.toHaveBeenCalled();
});
test("informa si el sistema no puede compartir y evita crear un PDF inútil", async () => {
  native.available.mockResolvedValue(false);
  await expect(setup().service.share(estimateFixture)).rejects.toThrow(
    "dispositivo",
  );
  expect(native.print).not.toHaveBeenCalled();
});
test("genera A4 con el snapshot y comparte una copia local sin modificar el presupuesto", async () => {
  const previous = JSON.stringify(estimateFixture);
  await setup().service.share(estimateFixture);
  expect(native.print).toHaveBeenCalledWith(
    expect.objectContaining({
      width: 595,
      height: 842,
      html: expect.stringContaining("Ana García"),
    }),
  );
  expect(native.share).toHaveBeenCalledWith(
    targetUri,
    expect.objectContaining({ mimeType: "application/pdf" }),
  );
  expect(native.files.has(targetUri)).toBe(true);
  expect(native.files.has(generatedUri)).toBe(false);
  expect(JSON.stringify(estimateFixture)).toBe(previous);
});
test("incrusta el logo privado en base64 sin borrar el original ni cargar URLs", async () => {
  native.files.set(logoUri, {
    size: 12,
    modified: Date.now(),
    content: "aGVsbG8=",
  });
  await setup({
    ...profile,
    logo: { uri: logoUri, mimeType: "image/png" },
  }).service.share(estimateFixture);
  expect(native.print.mock.calls[0][0].html).toContain(
    'src="data:image/png;base64,aGVsbG8="',
  );
  expect(native.print.mock.calls[0][0].html).not.toContain(logoUri);
  expect(native.files.has(logoUri)).toBe(true);
});
test.each([
  [logoUri, 0],
  [logoUri, 6 * 1024 * 1024],
  ["file:///documents/private.png", 12],
])(
  "rechaza un logo ilegible o ajeno al directorio privado (%s, %s)",
  async (uri, size) => {
    if (size) native.files.set(uri, { size, modified: Date.now() });
    await expect(
      setup({ ...profile, logo: { uri, mimeType: "image/png" } }).service.share(
        estimateFixture,
      ),
    ).rejects.toThrow("logo");
    expect(native.print).not.toHaveBeenCalled();
  },
);
test("un fallo del generador se propaga sin abrir el selector", async () => {
  native.print.mockRejectedValueOnce(new Error("Impresión fallida."));
  await expect(setup().service.share(estimateFixture)).rejects.toThrow(
    "Impresión fallida",
  );
  expect(native.share).not.toHaveBeenCalled();
  expect(native.files.has(targetUri)).toBe(false);
});
test("una copia incompleta limpia el parcial y el temporal sin compartirlos", async () => {
  native.copyFails = true;
  await expect(setup().service.share(estimateFixture)).rejects.toThrow(
    "Copia fallida",
  );
  expect(native.files.has(targetUri)).toBe(false);
  expect(native.files.has(generatedUri)).toBe(false);
  expect(native.share).not.toHaveBeenCalled();
});
test("un fallo al abrir el selector conserva la copia y permite reintentar", async () => {
  native.share.mockRejectedValueOnce(new Error("No se pudo abrir."));
  const { service } = setup();
  await expect(service.share(estimateFixture)).rejects.toThrow(
    "No se pudo abrir",
  );
  expect(native.files.has(targetUri)).toBe(true);
  expect(native.files.has(generatedUri)).toBe(false);
  await expect(service.share(estimateFixture)).resolves.toBeUndefined();
});
test("limpia sólo PDFs antiguos de su caché y conserva los recientes y otros archivos", async () => {
  const old = "file:///cache/estimate-pdfs/old.pdf";
  const recent = "file:///cache/estimate-pdfs/recent.pdf";
  const unknown = "file:///cache/estimate-pdfs/unknown.pdf";
  const other = "file:///cache/estimate-pdfs/data.json";
  for (const uri of [old, other])
    native.files.set(uri, { size: 10, modified: Date.now() - 2 * 86400000 });
  native.files.set(recent, { size: 10, modified: Date.now() });
  native.files.set(unknown, { size: 10, modified: null });
  await setup().service.share(estimateFixture);
  expect(native.files.has(old)).toBe(false);
  for (const uri of [recent, other, unknown, targetUri])
    expect(native.files.has(uri)).toBe(true);
});
test("una limpieza fallida no impide generar ni compartir el documento", async () => {
  native.files.set("file:///cache/estimate-pdfs/old.pdf", {
    size: 10,
    modified: Date.now() - 2 * 86400000,
  });
  native.deleteFails = true;
  await expect(setup().service.share(estimateFixture)).resolves.toBeUndefined();
  expect(native.share).toHaveBeenCalledOnce();
});
test("el número visible no puede escribir una ruta fuera del directorio de PDF", async () => {
  await setup().service.share({ ...estimateFixture, number: "../../Juan/.." });
  const path: string = native.share.mock.calls[0][0];
  expect(path).toBe("file:///cache/estimate-pdfs/Presupuesto-Juan-123.pdf");
});

test("rechaza un resultado de impresión sin archivo y no abre el selector", async () => {
  native.print.mockResolvedValueOnce({ uri: generatedUri, numberOfPages: 0 });
  await expect(setup().service.share(estimateFixture)).rejects.toThrow(
    "generar el PDF",
  );
  expect(native.share).not.toHaveBeenCalled();
});
test("dos exportaciones conservan copias independientes para las apps receptoras", async () => {
  const create = vi
    .fn()
    .mockResolvedValueOnce("primera")
    .mockResolvedValueOnce("segunda");
  const service = injectService(EstimatePdfService, {
    providers: [
      {
        provide: BusinessProfileService,
        useValue: { get: vi.fn().mockResolvedValue(profile) },
      },
      { provide: IdService, useValue: { create } },
    ],
  });
  await service.share(estimateFixture);
  await service.share(estimateFixture);
  const paths = native.share.mock.calls.map((call) => call[0]);
  expect(paths[0]).not.toBe(paths[1]);
  for (const path of paths) expect(native.files.has(path)).toBe(true);
});
