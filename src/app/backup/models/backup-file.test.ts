import { describe, expect, test } from "vitest";
import {
  jpegBase64,
  pngBase64,
  pngWithoutDataBase64,
  webpBase64,
} from "../../shared/testing/logo-fixtures";
import {
  BACKUP_FORMAT,
  base64ByteLength,
  buildBackup,
  MAX_LOGO_BYTES,
  parseBackup,
  summarizeBackup,
} from "./backup-file";
import {
  customerFixture,
  estimateFixture,
} from "../../shared/testing/domain-fixtures";

const data = {
  "customers.v1": [customerFixture],
  "estimates.v1": [estimateFixture],
  "business-profile.v1": {
    displayName: "Electricidad Juan",
    updatedAt: "2026-10-16T12:00:00Z",
  },
};
const visit = {
  id: "77777777-7777-4777-8777-777777777777",
  title: "Revisar instalación",
  kind: "visit",
  status: "pending",
  date: "2026-11-20",
  createdAt: "2026-11-06T10:00:00.000Z",
  updatedAt: "2026-11-06T10:00:00.000Z",
};
const item = estimateFixture.items[0]!;
const nested = [
  ["un ítem nulo", [{ ...estimateFixture, items: [null] }]],
  [
    "un precio en centavos con decimales",
    [{ ...estimateFixture, items: [{ ...item, unitPriceCents: 10.5 }] }],
  ],
  [
    "un precio negativo",
    [{ ...estimateFixture, items: [{ ...item, unitPriceCents: -1 }] }],
  ],
  [
    "una cantidad en texto",
    [{ ...estimateFixture, items: [{ ...item, quantity: "2" }] }],
  ],
  ["ítems repetidos", [{ ...estimateFixture, items: [item, item] }]],
  ["un snapshot nulo", [{ ...estimateFixture, customerSnapshot: null }]],
  [
    "una dirección inválida en el snapshot",
    [
      {
        ...estimateFixture,
        customerSnapshot: { name: "Ana", address: { id: "1" } },
      },
    ],
  ],
  [
    "una vigencia inexistente",
    [{ ...estimateFixture, validUntil: "2026-02-30" }],
  ],
] as const;
const logo = { mimeType: "image/png" as const, base64: pngBase64() };
const serialize = (value: unknown): string => JSON.stringify(value);
const backup = (change: (value: Record<string, unknown>) => void): string => {
  const value = structuredClone(buildBackup(data, logo)) as unknown as Record<
    string,
    unknown
  >;
  change(value);
  return serialize(value);
};

describe("copia de seguridad", () => {
  test("conserva datos y logo en un ciclo de exportar e importar", () => {
    const now = new Date("2026-11-06T12:00:00Z");
    const parsed = parseBackup(serialize(buildBackup(data, logo, now)));
    expect(parsed).toEqual({
      app: "nora",
      format: BACKUP_FORMAT,
      createdAt: now.toISOString(),
      data,
      logo,
    });
    expect(summarizeBackup(parsed)).toEqual({
      createdAt: now.toISOString(),
      customers: 1,
      estimates: 1,
      drafts: 0,
      visits: 0,
      profile: true,
      logo: true,
    });
  });
  test("valida las visitas y descarta el aviso local", () => {
    const visit = {
      id: "6f1c2f4e-2b1a-4c58-9d0e-1a2b3c4d5e6f",
      title: "Revisar instalación",
      kind: "visit",
      status: "pending",
      date: "2026-11-20",
      reminderId: "aviso-local",
      createdAt: "2026-11-06T10:00:00.000Z",
      updatedAt: "2026-11-06T10:00:00.000Z",
    };
    const parsed = parseBackup(
      serialize(buildBackup({ "visits.v1": [visit] }, undefined)),
    );
    const { reminderId: _local, ...expected } = visit;
    expect(parsed.data["visits.v1"]).toEqual([expected]);
    expect(summarizeBackup(parsed).visits).toBe(1);
    expect(() =>
      parseBackup(
        serialize(
          buildBackup({ "visits.v1": [{ ...visit, kind: "otra" }] }, undefined),
        ),
      ),
    ).toThrow(/visitas/);
  });
  test("acepta una copia sin datos y descarta la ruta local del logo", () => {
    const empty = parseBackup(serialize(buildBackup({}, undefined)));
    expect(empty.data).toEqual({});
    const withPath = parseBackup(
      serialize(
        buildBackup(
          {
            "business-profile.v1": {
              displayName: "Juan",
              logo: { uri: "file:///otro/logo.png", mimeType: "image/png" },
            },
          },
          undefined,
        ),
      ),
    );
    expect(withPath.data["business-profile.v1"]).toEqual({
      displayName: "Juan",
    });
  });
  test.each([
    ["texto que no es JSON", "esto no es json"],
    ["JSON de otra app", serialize({ app: "otra", format: 1 })],
    ["un arreglo", serialize([])],
  ])("rechaza %s", (_name, text) => {
    expect(() => parseBackup(text)).toThrow("no es una copia de seguridad");
  });
  test("pide actualizar Nora cuando la copia es de un formato más nuevo", () => {
    expect(() =>
      parseBackup(backup((value) => (value["format"] = BACKUP_FORMAT + 1))),
    ).toThrow("versión más nueva");
  });
  test.each([
    [
      "clientes repetidos",
      (value: Record<string, unknown>) =>
        ((value["data"] as Record<string, unknown>)["customers.v1"] = [
          customerFixture,
          customerFixture,
        ]),
      "repetidos",
    ],
    [
      "un estado inexistente",
      (value: Record<string, unknown>) =>
        ((value["data"] as Record<string, unknown>)["estimates.v1"] = [
          { ...estimateFixture, status: "pagado" },
        ]),
      "inválidos",
    ],
    [
      "números de presupuesto repetidos",
      (value: Record<string, unknown>) =>
        ((value["data"] as Record<string, unknown>)["estimates.v1"] = [
          estimateFixture,
          { ...estimateFixture, id: "55555555-5555-4555-8555-555555555555" },
        ]),
      "números de presupuesto repetidos",
    ],
    [
      "un identificador que no es UUID",
      (value: Record<string, unknown>) =>
        ((value["data"] as Record<string, unknown>)["customers.v1"] = [
          { ...customerFixture, id: "1" },
        ]),
      "inválidos",
    ],
    [
      "un perfil sin nombre",
      (value: Record<string, unknown>) =>
        ((value["data"] as Record<string, unknown>)["business-profile.v1"] = {
          displayName: " ",
        }),
      "negocio",
    ],
    [
      "una dirección nula en un cliente",
      (value: Record<string, unknown>) =>
        ((value["data"] as Record<string, unknown>)["customers.v1"] = [
          { ...customerFixture, addresses: [null] },
        ]),
      "clientes",
    ],
    [
      "un teléfono inválido en un cliente",
      (value: Record<string, unknown>) =>
        ((value["data"] as Record<string, unknown>)["customers.v1"] = [
          {
            ...customerFixture,
            phone: { areaCode: "0376", number: "4123456", whatsapp: true },
          },
        ]),
      "clientes",
    ],
    [
      "una visita con fecha inexistente",
      (value: Record<string, unknown>) =>
        ((value["data"] as Record<string, unknown>)["visits.v1"] = [
          { ...visit, date: "2026-02-30" },
        ]),
      "visitas",
    ],
    [
      "un borrador en curso sin formulario",
      (value: Record<string, unknown>) =>
        ((value["data"] as Record<string, unknown>)["estimate-recovery.v1"] = [
          {
            id: "66666666-6666-4666-8666-666666666666",
            estimateId: null,
            updatedAt: "2026-10-16T12:00:00Z",
            form: null,
            editor: null,
          },
        ]),
      "borradores",
    ],
    [
      "un logo con formato no permitido",
      (value: Record<string, unknown>) =>
        (value["logo"] = { mimeType: "image/gif", base64: "AAAA" }),
      "logo",
    ],
    [
      "un logo con caracteres inválidos",
      (value: Record<string, unknown>) =>
        (value["logo"] = { mimeType: "image/png", base64: "no es base64!" }),
      "logo",
    ],
    [
      "un logo de más de 5 MB",
      (value: Record<string, unknown>) =>
        (value["logo"] = {
          mimeType: "image/png",
          base64: "A".repeat(7 * 1024 * 1024),
        }),
      "5 MB",
    ],
  ])("rechaza %s y no devuelve datos parciales", (_name, change, message) => {
    expect(() => parseBackup(backup(change))).toThrow(message);
  });
  test.each(nested)(
    "rechaza %s dentro de un presupuesto",
    (_name, estimates) => {
      expect(() =>
        parseBackup(
          backup((value) => {
            (value["data"] as Record<string, unknown>)["estimates.v1"] =
              estimates;
          }),
        ),
      ).toThrow("presupuestos");
    },
  );
  test("rechaza un logo sin datos del negocio", () => {
    expect(() =>
      parseBackup(
        serialize(buildBackup({ "customers.v1": [customerFixture] }, logo)),
      ),
    ).toThrow("negocio");
  });
  test("acepta presupuestos sin ítems, sin vigencia y con snapshot mínimo", () => {
    const minimal = {
      ...estimateFixture,
      items: [],
      validUntil: undefined,
      customerSnapshot: { name: "Ana" },
    };
    expect(() =>
      parseBackup(
        serialize(buildBackup({ "estimates.v1": [minimal] }, undefined)),
      ),
    ).not.toThrow();
  });
  describe("tamaño del logo", () => {
    const png = (bytes: number) => ({
      mimeType: "image/png" as const,
      base64: pngBase64(bytes),
    });
    test("mide los bytes reales descontando el relleno", () => {
      expect(base64ByteLength("iVBORw0KGgo=")).toBe(8);
      expect(base64ByteLength(pngBase64())).toBe(
        Buffer.from(pngBase64(), "base64").length,
      );
      expect(base64ByteLength("AAAA")).toBe(3);
      expect(base64ByteLength(png(MAX_LOGO_BYTES).base64)).toBe(MAX_LOGO_BYTES);
    });
    test("un logo de exactamente 5 MiB completa el ciclo de exportar e importar", () => {
      const exact = png(MAX_LOGO_BYTES);
      const parsed = parseBackup(
        serialize(
          buildBackup(
            { "business-profile.v1": data["business-profile.v1"] },
            exact,
          ),
        ),
      );
      expect(parsed.logo).toEqual(exact);
    });
    test("un logo un byte por encima del límite se rechaza", () => {
      expect(() =>
        parseBackup(
          serialize(
            buildBackup(
              { "business-profile.v1": data["business-profile.v1"] },
              png(MAX_LOGO_BYTES + 1),
            ),
          ),
        ),
      ).toThrow("5 MB");
    });
    test("rechaza un Base64 con longitud no canónica", () => {
      expect(() =>
        parseBackup(
          serialize(
            buildBackup(
              { "business-profile.v1": data["business-profile.v1"] },
              { mimeType: "image/png", base64: "AAAAA" },
            ),
          ),
        ),
      ).toThrow("logo");
    });
  });
  describe("contenido del logo", () => {
    const withLogo = (mimeType: string, base64: string) =>
      serialize(
        buildBackup({ "business-profile.v1": data["business-profile.v1"] }, {
          mimeType,
          base64,
        } as never),
      );
    test("un WebP justo en el tope de 16 megapíxeles se acepta", () => {
      expect(() =>
        parseBackup(withLogo("image/webp", webpBase64(4000, 4000))),
      ).not.toThrow();
    });
    test("acepta PNG, JPEG y WebP bien formados", () => {
      expect(() =>
        parseBackup(withLogo("image/png", pngBase64())),
      ).not.toThrow();
      expect(() =>
        parseBackup(withLogo("image/jpeg", jpegBase64())),
      ).not.toThrow();
      expect(() =>
        parseBackup(withLogo("image/webp", webpBase64())),
      ).not.toThrow();
    });
    test.each([
      ["AAAA como PNG", "image/png", "AAAA"],
      [
        "texto en Base64 como JPEG",
        "image/jpeg",
        Buffer.from("hola mundo").toString("base64"),
      ],
      ["un PNG sin datos de imagen", "image/png", pngWithoutDataBase64()],
      [
        "un WebP que declara más de 16 megapíxeles",
        "image/webp",
        webpBase64(4001, 4000),
      ],
      [
        "un WebP truncado",
        "image/webp",
        Buffer.from(
          Buffer.from(webpBase64(), "base64").subarray(0, 16),
        ).toString("base64"),
      ],
      [
        "un PNG que declara miles de millones de píxeles",
        "image/png",
        Buffer.from(
          Buffer.from(pngBase64(), "base64").map((byte, index) =>
            index === 18 || index === 22
              ? 0xea
              : index === 19 || index === 23
                ? 0x60
                : byte,
          ),
        ).toString("base64"),
      ],
      ["un PNG declarado como JPEG", "image/jpeg", pngBase64()],
      ["un JPEG declarado como WebP", "image/webp", jpegBase64()],
      ["un WebP declarado como PNG", "image/png", webpBase64()],
      [
        "un PNG truncado sin cierre",
        "image/png",
        Buffer.from(
          Buffer.from(pngBase64(), "base64").subarray(0, 40),
        ).toString("base64"),
      ],
      [
        "un PNG de 0x0",
        "image/png",
        Buffer.from(
          Buffer.from(pngBase64(), "base64").map((byte, index) =>
            index === 19 ? 0 : byte,
          ),
        ).toString("base64"),
      ],
    ])("rechaza %s", (_name, mimeType, base64) => {
      expect(() => parseBackup(withLogo(mimeType, base64))).toThrow("logo");
    });
  });
});
