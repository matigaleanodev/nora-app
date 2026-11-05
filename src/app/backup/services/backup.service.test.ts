import { injectService } from "@ng-native/testing";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { LocalStorageService } from "../../core/storage/local-storage.service";
import { BusinessLogoService } from "../../business/services/business-logo.service";
import { VisitRemindersService } from "../../agenda/services/visit-reminders.service";
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { buildEstimatePdf } from "../../estimates/utils/estimate-pdf-document";
import {
  pngBase64,
  pngUndecodableBase64,
  pngWithoutDataBase64,
  webpBase64,
} from "../../shared/testing/logo-fixtures";
import { BackupService } from "./backup.service";
import {
  buildBackup,
  BACKUP_KEYS,
  MAX_BACKUP_BYTES,
} from "../models/backup-file";
import { isUsableLogo } from "../models/logo-image";
import {
  customerFixture,
  estimateFixture,
} from "../../shared/testing/domain-fixtures";

vi.mock("../models/logo-image", async (original) => {
  const actual = await original<typeof import("../models/logo-image")>();
  return { ...actual, isUsableLogo: vi.fn(actual.isUsableLogo) };
});
const native = vi.hoisted(() => ({
  files: new Map<string, string>(),
  share: vi.fn(),
  available: vi.fn(),
  pick: vi.fn(),
  manipulate: vi.fn(),
  release: vi.fn(),
}));
vi.mock("expo-image-manipulator", () => ({
  SaveFormat: { PNG: "png" },
  ImageManipulator: { manipulate: native.manipulate },
}));
vi.mock("expo-sharing", () => ({
  shareAsync: native.share,
  isAvailableAsync: native.available,
}));
vi.mock("expo-document-picker", () => ({ getDocumentAsync: native.pick }));
vi.mock("expo-file-system", () => {
  const join = (base: string | { uri: string }, name?: string) =>
    (typeof base === "string" ? base : base.uri).replace(/\/$/, "") +
    (name ? "/" + name : "");
  class Directory {
    readonly uri: string;
    constructor(base: string | { uri: string }, name?: string) {
      this.uri = join(base, name) + "/";
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
      this.uri = join(base, name);
    }
    get exists() {
      return native.files.has(this.uri);
    }
    get size() {
      return native.files.get(this.uri)?.length ?? 0;
    }
    async text() {
      return native.files.get(this.uri) ?? "";
    }
    async bytes() {
      return new Uint8Array(
        Buffer.from(native.files.get(this.uri) ?? "", "base64"),
      );
    }
    write(content: string, _options?: unknown) {
      native.files.set(this.uri, content);
    }
    delete() {
      native.files.delete(this.uri);
    }
  }
  return {
    File,
    Directory,
    Paths: { cache: { uri: "file:///cache/" } },
  };
});

const profile = {
  displayName: "Electricidad Juan",
  updatedAt: "2026-10-16T12:00:00Z",
  logo: {
    uri: "file:///documents/business-logos/viejo.png",
    mimeType: "image/png",
  },
};
const stored: Record<string, unknown> = {
  "customers.v1": [customerFixture],
  "estimates.v1": [estimateFixture],
  "business-profile.v1": profile,
};
const storage = {
  readMany: vi.fn(),
  replaceMany: vi.fn(),
};
const logos = {
  readBase64: vi.fn(),
  restore: vi.fn(),
  removeOwned: vi.fn(),
};
const setup = () =>
  injectService(BackupService, {
    providers: [
      { provide: LocalStorageService, useValue: storage },
      { provide: BusinessLogoService, useValue: logos },
    ],
  });
const file = (name: string, content: string): string => {
  const uri = `file:///cache/picked/${name}`;
  native.files.set(uri, content);
  return uri;
};

beforeEach(() => {
  vi.clearAllMocks();
  native.files.clear();
  storage.readMany.mockImplementation(async (keys: readonly string[]) =>
    Object.fromEntries(
      keys.filter((key) => key in stored).map((key) => [key, stored[key]]),
    ),
  );
  storage.replaceMany.mockResolvedValue(undefined);
  native.available.mockResolvedValue(true);
  native.share.mockResolvedValue(undefined);
  logos.readBase64.mockResolvedValue(pngBase64());
  logos.restore.mockResolvedValue({
    uri: "file:///documents/business-logos/nuevo.png",
    mimeType: "image/png",
  });
  logos.removeOwned.mockResolvedValue(undefined);
  convertsWebp(true);
});

/** Simula la conversión nativa WebP → PNG: genera un PNG en la caché o rechaza el render. */
function convertsWebp(works: boolean, output = pngBase64()) {
  native.manipulate.mockImplementation(() => ({
    renderAsync: async () => {
      if (!works) throw new Error("No se pudo decodificar el WebP.");
      return {
        saveAsync: async () => {
          native.files.set("file:///cache/ImageManipulator/salida.png", output);
          return { uri: "file:///cache/ImageManipulator/salida.png" };
        },
        release: native.release,
      };
    },
    release: native.release,
  }));
}
const leftovers = () =>
  [...native.files.keys()].filter(
    (uri) => uri.includes("/logo-check/") || uri.includes("/ImageManipulator/"),
  );

describe("BackupService", () => {
  test("crea un archivo con los datos y el logo, sin la ruta local del logo", async () => {
    const { file: created, summary } = await setup().create(
      new Date(2026, 10, 6, 9, 30),
    );
    expect(created.uri).toBe(
      "file:///cache/backups/copia-nora-2026-11-06.json",
    );
    const saved = JSON.parse(native.files.get(created.uri)!);
    expect(saved.data["business-profile.v1"]).toEqual({
      displayName: "Electricidad Juan",
      updatedAt: "2026-10-16T12:00:00Z",
    });
    expect(saved.logo).toEqual({
      mimeType: "image/png",
      base64: pngBase64(),
    });
    expect(saved.data["customers.v1"]).toEqual([customerFixture]);
    expect(summary).toMatchObject({ customers: 1, estimates: 1, logo: true });
  });
  test("crea la copia aunque el archivo del logo ya no exista", async () => {
    logos.readBase64.mockResolvedValue(undefined);
    const { summary } = await setup().create();
    expect(summary.logo).toBe(false);
    expect(summary.profile).toBe(true);
  });
  test("reemplaza la copia anterior de la caché al crear una nueva", async () => {
    native.files.set("file:///cache/backups/copia-nora-2026-01-01.json", "{}");
    await setup().create(new Date(2026, 10, 6));
    expect([...native.files.keys()]).toEqual([
      "file:///cache/backups/copia-nora-2026-11-06.json",
    ]);
  });
  test("comparte el archivo como JSON y exige disponibilidad nativa", async () => {
    await setup().share();
    expect(native.share).toHaveBeenCalledWith(
      expect.stringMatching(/copia-nora-.*\.json$/),
      expect.objectContaining({ mimeType: "application/json" }),
    );
    native.available.mockResolvedValue(false);
    await expect(setup().share()).rejects.toThrow("dispositivo");
  });
  test("elegir un archivo cancelado no hace nada y uno inválido falla sin restaurar", async () => {
    native.pick.mockResolvedValueOnce({ canceled: true, assets: null });
    expect(await setup().pick()).toBeNull();
    native.pick.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: file("malo.json", "no es json") }],
    });
    await expect(setup().pick()).rejects.toThrow("no es una copia");
    expect(storage.replaceMany).not.toHaveBeenCalled();
  });
  test("lee una copia válida y borra la copia temporal del selector", async () => {
    const uri = file(
      "copia.json",
      JSON.stringify(
        buildBackup({ "customers.v1": [customerFixture] }, undefined),
      ),
    );
    native.pick.mockResolvedValueOnce({ canceled: false, assets: [{ uri }] });
    const backup = await setup().pick();
    expect(backup?.data["customers.v1"]).toEqual([customerFixture]);
    expect(native.files.has(uri)).toBe(false);
  });
  test("restaura el logo antes de reemplazar los datos y borra el anterior al terminar", async () => {
    const order: string[] = [];
    logos.restore.mockImplementation(async () => {
      order.push("logo");
      return {
        uri: "file:///documents/business-logos/nuevo.png",
        mimeType: "image/png",
      };
    });
    storage.replaceMany.mockImplementation(
      async () => void order.push("datos"),
    );
    logos.removeOwned.mockImplementation(
      async () => void order.push("limpieza"),
    );
    await setup().restore(
      buildBackup(
        { "business-profile.v1": { displayName: "Juan" } },
        { mimeType: "image/png", base64: pngBase64() },
      ),
    );
    expect(order).toEqual(["logo", "datos", "limpieza"]);
    expect(storage.replaceMany).toHaveBeenCalledWith(BACKUP_KEYS, {
      "business-profile.v1": {
        displayName: "Juan",
        logo: {
          uri: "file:///documents/business-logos/nuevo.png",
          mimeType: "image/png",
        },
      },
    });
    expect(logos.removeOwned).toHaveBeenCalledWith(profile.logo);
  });
  test("si falla el reemplazo conserva el logo anterior y elimina el nuevo", async () => {
    storage.replaceMany.mockRejectedValue(new Error("Disco lleno"));
    await expect(
      setup().restore(
        buildBackup(
          { "business-profile.v1": { displayName: "Juan" } },
          { mimeType: "image/png", base64: pngBase64() },
        ),
      ),
    ).rejects.toThrow("Disco lleno");
    expect(logos.removeOwned).toHaveBeenCalledTimes(1);
    expect(logos.removeOwned).toHaveBeenCalledWith({
      uri: "file:///documents/business-logos/nuevo.png",
      mimeType: "image/png",
    });
  });
  test("una copia vacía elimina las claves que no incluye", async () => {
    await setup().restore(buildBackup({}, undefined));
    expect(storage.replaceMany).toHaveBeenCalledWith(BACKUP_KEYS, {});
    expect(logos.restore).not.toHaveBeenCalled();
  });
  test("una copia con un ítem nulo se rechaza al elegirla y no toca los datos locales", async () => {
    const uri = file(
      "dañada.json",
      JSON.stringify(
        buildBackup(
          { "estimates.v1": [{ ...estimateFixture, items: [null] }] },
          undefined,
        ),
      ),
    );
    native.pick.mockResolvedValueOnce({ canceled: false, assets: [{ uri }] });
    await expect(setup().pick()).rejects.toThrow("dañada");
    expect(storage.replaceMany).not.toHaveBeenCalled();
    expect(logos.restore).not.toHaveBeenCalled();
    expect(native.files.has(uri)).toBe(false);
  });
  test("un logo válido de exactamente 5 MiB se exporta, se restaura y sirve para generar el PDF", async () => {
    const base64 = pngBase64(5 * 1024 * 1024);
    logos.readBase64.mockResolvedValue(base64);
    const service = setup();
    const { file: created } = await service.create(new Date(2026, 10, 6));
    native.pick.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: created.uri }],
    });
    const backup = await service.pick();
    expect(backup?.logo).toEqual({ mimeType: "image/png", base64 });
    await service.restore(backup!);
    expect(logos.restore).toHaveBeenCalledWith(base64, "image/png");
    const font = {
      regular: new Uint8Array(
        readFileSync(
          new URL("../../../../assets/NotoSans.ttf", import.meta.url),
        ),
      ),
      bold: new Uint8Array(
        readFileSync(
          new URL("../../../../assets/NotoSans-Bold.ttf", import.meta.url),
        ),
      ),
    };
    const pdf = await buildEstimatePdf(
      estimateFixture,
      { displayName: "Juan", updatedAt: "2026-10-16T12:00:00Z" },
      font,
      {
        bytes: new Uint8Array(Buffer.from(backup!.logo!.base64, "base64")),
        mimeType: "image/png",
      },
    );
    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(1);
  });
  test("un PNG con cabecera y cierre pero sin datos de imagen se rechaza al elegir y no toca nada", async () => {
    const uri = file(
      "sin-datos.json",
      JSON.stringify(
        buildBackup(
          { "business-profile.v1": { displayName: "Juan" } },
          {
            mimeType: "image/png",
            base64: pngWithoutDataBase64(5 * 1024 * 1024),
          },
        ),
      ),
    );
    native.pick.mockResolvedValueOnce({ canceled: false, assets: [{ uri }] });
    await expect(setup().pick()).rejects.toThrow("logo");
    expect(storage.replaceMany).not.toHaveBeenCalled();
    expect(logos.restore).not.toHaveBeenCalled();
    expect(logos.removeOwned).not.toHaveBeenCalled();
  });
  test("un PNG bien formado que pdf-lib no puede decodificar se rechaza, antes de reemplazar nada", async () => {
    const corrupt = {
      mimeType: "image/png" as const,
      base64: pngUndecodableBase64(),
    };
    const copy = buildBackup(
      { "business-profile.v1": { displayName: "Juan" } },
      corrupt,
    );
    const uri = file("corrupto.json", JSON.stringify(copy));
    native.pick.mockResolvedValueOnce({ canceled: false, assets: [{ uri }] });
    await expect(setup().pick()).rejects.toThrow("no es una imagen");
    // Aunque la copia llegara a restore sin pasar por pick, el perfil anterior queda intacto.
    await expect(setup().restore(copy)).rejects.toThrow("no es una imagen");
    expect(logos.restore).not.toHaveBeenCalled();
    expect(storage.replaceMany).not.toHaveBeenCalled();
    expect(logos.removeOwned).not.toHaveBeenCalled();
  });
  test("restaurar una copia elegida no vuelve a decodificar su logo, pero una armada a mano sí", async () => {
    const copy = buildBackup(
      { "business-profile.v1": { displayName: "Juan" } },
      { mimeType: "image/png", base64: pngBase64() },
    );
    const uri = file("con-logo.json", JSON.stringify(copy));
    native.pick.mockResolvedValueOnce({ canceled: false, assets: [{ uri }] });
    const service = setup();
    const picked = await service.pick();
    vi.mocked(isUsableLogo).mockClear();
    await service.restore(picked!);
    expect(isUsableLogo).not.toHaveBeenCalled();
    await service.restore(copy);
    expect(isUsableLogo).toHaveBeenCalledTimes(1);
  });
  test("un WebP que la conversión nativa rechaza conserva el perfil y el logo anteriores y no deja temporales", async () => {
    convertsWebp(false);
    const copy = buildBackup(
      { "business-profile.v1": { displayName: "Juan" } },
      { mimeType: "image/webp", base64: webpBase64() },
    );
    const uri = file("webp-vacio.json", JSON.stringify(copy));
    native.pick.mockResolvedValueOnce({ canceled: false, assets: [{ uri }] });
    await expect(setup().pick()).rejects.toThrow("no es una imagen");
    await expect(setup().restore(copy)).rejects.toThrow("no es una imagen");
    expect(logos.restore).not.toHaveBeenCalled();
    expect(storage.replaceMany).not.toHaveBeenCalled();
    expect(logos.removeOwned).not.toHaveBeenCalled();
    expect(leftovers()).toEqual([]);
    expect(native.release).toHaveBeenCalled();
  });
  test("un WebP que excede el tope se rechaza antes de invocar la conversión nativa", async () => {
    const copy = buildBackup(
      { "business-profile.v1": { displayName: "Juan" } },
      { mimeType: "image/webp", base64: webpBase64(5000, 5000) },
    );
    const uri = file("webp-enorme.json", JSON.stringify(copy));
    native.pick.mockResolvedValueOnce({ canceled: false, assets: [{ uri }] });
    await expect(setup().pick()).rejects.toThrow("logo");
    await expect(setup().restore(copy)).rejects.toThrow("no es una imagen");
    expect(native.manipulate).not.toHaveBeenCalled();
    expect(storage.replaceMany).not.toHaveBeenCalled();
    expect(logos.restore).not.toHaveBeenCalled();
    expect(logos.removeOwned).not.toHaveBeenCalled();
    expect(leftovers()).toEqual([]);
  });
  test("un WebP cuyo PNG convertido excede el tope se rechaza y limpia los temporales", async () => {
    const huge = Buffer.from(pngBase64(), "base64");
    huge.writeUInt32BE(5000, 16);
    huge.writeUInt32BE(5000, 20);
    convertsWebp(true, huge.toString("base64"));
    const copy = buildBackup(
      { "business-profile.v1": { displayName: "Juan" } },
      { mimeType: "image/webp", base64: webpBase64() },
    );
    await expect(setup().restore(copy)).rejects.toThrow("no es una imagen");
    expect(native.manipulate).toHaveBeenCalledTimes(1);
    expect(storage.replaceMany).not.toHaveBeenCalled();
    expect(logos.restore).not.toHaveBeenCalled();
    expect(logos.removeOwned).not.toHaveBeenCalled();
    expect(leftovers()).toEqual([]);
  });
  test("un WebP que se convierte sigue admitido, se restaura y limpia los temporales", async () => {
    const copy = buildBackup(
      { "business-profile.v1": { displayName: "Juan" } },
      { mimeType: "image/webp", base64: webpBase64() },
    );
    const uri = file("webp.json", JSON.stringify(copy));
    native.pick.mockResolvedValueOnce({ canceled: false, assets: [{ uri }] });
    const service = setup();
    const picked = await service.pick();
    expect(picked?.logo?.mimeType).toBe("image/webp");
    await service.restore(picked!);
    expect(logos.restore).toHaveBeenCalledWith(webpBase64(), "image/webp");
    expect(leftovers()).toEqual([]);
  });
  test("al exportar omite un WebP que no se podría convertir y conserva uno válido", async () => {
    stored["business-profile.v1"] = {
      ...profile,
      logo: { ...profile.logo, mimeType: "image/webp" },
    };
    try {
      logos.readBase64.mockResolvedValue(webpBase64());
      const valid = await setup().create(new Date(2026, 10, 6));
      expect(JSON.parse(native.files.get(valid.file.uri)!).logo).toEqual({
        mimeType: "image/webp",
        base64: webpBase64(),
      });
      convertsWebp(false);
      const invalid = await setup().create(new Date(2026, 10, 7));
      expect(
        JSON.parse(native.files.get(invalid.file.uri)!).logo,
      ).toBeUndefined();
      expect(leftovers()).toEqual([]);
    } finally {
      stored["business-profile.v1"] = profile;
    }
  });
  test("al exportar no incluye el marcador local de aviso de las visitas", async () => {
    stored["visits.v1"] = [
      {
        id: "00000000-0000-4000-8000-0000000000aa",
        title: "Revisar instalación",
        kind: "visit",
        status: "pending",
        date: "2030-03-10",
        createdAt: "2026-11-06T10:00:00.000Z",
        updatedAt: "2026-11-06T10:00:00.000Z",
        reminderId: "00000000-0000-4000-8000-0000000000aa",
      },
    ];
    try {
      const { file: created } = await setup().create(new Date(2026, 10, 6));
      const [visit] = JSON.parse(native.files.get(created.uri)!).data[
        "visits.v1"
      ];
      expect(visit.title).toBe("Revisar instalación");
      expect(visit).not.toHaveProperty("reminderId");
    } finally {
      delete stored["visits.v1"];
    }
  });
  test("al exportar no incluye un logo que no se podría restaurar", async () => {
    logos.readBase64.mockResolvedValue(pngUndecodableBase64());
    const { file: created, summary } = await setup().create(
      new Date(2026, 10, 6),
    );
    expect(JSON.parse(native.files.get(created.uri)!).logo).toBeUndefined();
    expect(summary.logo).toBe(false);
  });
  test("un logo por encima de 5 MiB se rechaza al elegir la copia", async () => {
    const base64 = pngBase64(5 * 1024 * 1024 + 1);
    const uri = file(
      "grande.json",
      JSON.stringify(
        buildBackup(
          { "business-profile.v1": { displayName: "Juan" } },
          { mimeType: "image/png", base64 },
        ),
      ),
    );
    native.pick.mockResolvedValueOnce({ canceled: false, assets: [{ uri }] });
    await expect(setup().pick()).rejects.toThrow("5 MB");
    expect(storage.replaceMany).not.toHaveBeenCalled();
  });
  test("al restaurar quita los avisos viejos y concilia los de la copia, en ese orden", async () => {
    const order: string[] = [];
    const reminders = {
      cancelAll: vi.fn(async () => void order.push("cancelAll")),
      reconcile: vi.fn(async () => void order.push("reconcile")),
    };
    storage.replaceMany.mockImplementation(
      async () => void order.push("datos"),
    );
    const service = injectService(BackupService, {
      providers: [
        { provide: LocalStorageService, useValue: storage },
        { provide: BusinessLogoService, useValue: logos },
        { provide: VisitRemindersService, useValue: reminders },
      ],
    });
    await service.restore(buildBackup({}, undefined));
    expect(order).toEqual(["datos", "cancelAll", "reconcile"]);
  });
  test("si los avisos fallan, la copia igual queda restaurada", async () => {
    const reminders = {
      cancelAll: vi.fn().mockRejectedValue(new Error("sin módulo")),
      reconcile: vi.fn(),
    };
    const service = injectService(BackupService, {
      providers: [
        { provide: LocalStorageService, useValue: storage },
        { provide: BusinessLogoService, useValue: logos },
        { provide: VisitRemindersService, useValue: reminders },
      ],
    });
    await expect(
      service.restore(buildBackup({}, undefined)),
    ).resolves.toBeUndefined();
    expect(storage.replaceMany).toHaveBeenCalled();
  });
  test("un logo con bytes que no son una imagen se rechaza antes de tocar datos ni borrar el logo anterior", async () => {
    const uri = file(
      "logo-falso.json",
      JSON.stringify(
        buildBackup(
          { "business-profile.v1": { displayName: "Juan" } },
          { mimeType: "image/png", base64: "AAAA" },
        ),
      ),
    );
    native.pick.mockResolvedValueOnce({ canceled: false, assets: [{ uri }] });
    await expect(setup().pick()).rejects.toThrow("logo");
    expect(storage.replaceMany).not.toHaveBeenCalled();
    expect(logos.restore).not.toHaveBeenCalled();
    expect(logos.removeOwned).not.toHaveBeenCalled();
  });
  test("al exportar omite un logo que la importación rechazaría", async () => {
    logos.readBase64.mockResolvedValue("AAAA");
    const { summary } = await setup().create();
    expect(summary.logo).toBe(false);
  });
});

describe("tamaño de la copia exportada", () => {
  /** Una copia cuyo tamaño exacto en bytes se controla con las notas de un cliente. */
  const withSize = async (target: number) => {
    stored["customers.v1"] = [{ ...customerFixture, notes: "" }];
    const base = await setup().create(new Date(2026, 10, 6));
    const baseSize = base.file.size;
    stored["customers.v1"] = [
      { ...customerFixture, notes: "a".repeat(target - baseSize) },
    ];
  };
  const restoreStored = () => {
    stored["customers.v1"] = [customerFixture];
  };

  test("una copia de exactamente 40 MiB se exporta y se comparte", async () => {
    try {
      await withSize(MAX_BACKUP_BYTES);
      const summary = await setup().share();
      expect(summary.customers).toBe(1);
      expect(native.share).toHaveBeenCalledTimes(1);
      const [created] = native.share.mock.calls[0]!;
      expect(native.files.get(created)!.length).toBe(MAX_BACKUP_BYTES);
    } finally {
      restoreStored();
    }
  });

  test("una copia de un byte más se rechaza antes de abrir la hoja y elimina el temporal", async () => {
    try {
      await withSize(MAX_BACKUP_BYTES + 1);
      await expect(setup().share()).rejects.toThrow("40 MiB");
      expect(native.share).not.toHaveBeenCalled();
      expect(
        [...native.files.keys()].filter((uri) => uri.includes("/backups/")),
      ).toEqual([]);
    } finally {
      restoreStored();
    }
  });
});
