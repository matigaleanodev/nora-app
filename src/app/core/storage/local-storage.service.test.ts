import { beforeEach, describe, expect, test, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { LocalStorageService } from "./local-storage.service";

const sqlite = vi.hoisted(() => ({
  openDatabaseAsync: vi.fn(),
  execAsync: vi.fn(),
  getFirstAsync: vi.fn(),
  getAllAsync: vi.fn(),
  runAsync: vi.fn(),
  withExclusiveTransactionAsync: vi.fn(),
}));
vi.mock("expo-sqlite", () => ({ openDatabaseAsync: sqlite.openDatabaseAsync }));

beforeEach(() => {
  vi.resetAllMocks();
  sqlite.openDatabaseAsync.mockResolvedValue(sqlite);
  sqlite.execAsync.mockResolvedValue(undefined);
  sqlite.getFirstAsync.mockResolvedValue(null);
  sqlite.runAsync.mockResolvedValue(undefined);
  sqlite.getAllAsync.mockResolvedValue([]);
  sqlite.withExclusiveTransactionAsync.mockImplementation(
    async (task: (transaction: typeof sqlite) => Promise<void>) => task(sqlite),
  );
});

describe("LocalStorageService", () => {
  test("devuelve null cuando la clave no existe y deserializa datos guardados", async () => {
    const storage = new LocalStorageService();
    expect(await storage.read("ausente")).toBeNull();
    sqlite.getFirstAsync.mockResolvedValueOnce({ value: '{"name":"Ana"}' });
    expect(await storage.read("cliente")).toEqual({ name: "Ana" });
  });
  test("comparte la inicialización entre operaciones simultáneas", async () => {
    const storage = new LocalStorageService();
    await Promise.all([
      storage.read("clientes"),
      storage.read("presupuestos"),
      storage.write("tareas", []),
    ]);
    expect(sqlite.openDatabaseAsync).toHaveBeenCalledTimes(1);
    expect(sqlite.execAsync).toHaveBeenCalledTimes(1);
  });
  test("guarda JSON con parámetros SQL sin interpolar claves ni valores", async () => {
    const storage = new LocalStorageService();
    const key = "cliente'; DROP TABLE app_storage; --";
    await storage.write(key, { notes: "O'Brien" });
    expect(sqlite.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("VALUES (?, ?)"),
      key,
      JSON.stringify({ notes: "O'Brien" }),
    );
    expect(sqlite.runAsync.mock.calls[0][0]).not.toContain(key);
  });
  test("permite reintentar cuando falla la apertura o la creación de la tabla", async () => {
    const storage = new LocalStorageService();
    sqlite.openDatabaseAsync.mockRejectedValueOnce(
      new Error("Apertura fallida"),
    );
    await expect(storage.read("clientes")).rejects.toThrow("Apertura fallida");
    sqlite.execAsync.mockRejectedValueOnce(new Error("Inicialización fallida"));
    await expect(storage.read("clientes")).rejects.toThrow(
      "Inicialización fallida",
    );
    expect(await storage.read("clientes")).toBeNull();
    expect(sqlite.openDatabaseAsync).toHaveBeenCalledTimes(3);
  });
  test("propaga errores de lectura, JSON inválido y escritura", async () => {
    const storage = new LocalStorageService();
    sqlite.getFirstAsync.mockRejectedValueOnce(new Error("Lectura fallida"));
    await expect(storage.read("clientes")).rejects.toThrow("Lectura fallida");
    sqlite.getFirstAsync.mockResolvedValueOnce({ value: "{inválido" });
    await expect(storage.read("clientes")).rejects.toThrow();
    sqlite.runAsync.mockRejectedValueOnce(new Error("Disco lleno"));
    await expect(storage.write("clientes", [])).rejects.toThrow("Disco lleno");
  });
  test("serializa modificaciones concurrentes sin perder incrementos", async () => {
    const storage = new LocalStorageService();
    let value = 0;
    sqlite.getFirstAsync.mockImplementation(async () => ({
      value: JSON.stringify(value),
    }));
    sqlite.runAsync.mockImplementation(
      async (_sql: string, _key: string, json: string) => {
        value = JSON.parse(json) as number;
      },
    );
    await Promise.all(
      Array.from({ length: 5 }, () =>
        storage.update<number>("contador", (current) => (current ?? 0) + 1),
      ),
    );
    expect(value).toBe(5);
  });
  test("lee varias claves en una consulta con parámetros y deserializa cada valor", async () => {
    const storage = new LocalStorageService();
    sqlite.getAllAsync.mockResolvedValueOnce([
      { key: "clientes", value: '[{"name":"Ana"}]' },
    ]);
    expect(await storage.readMany(["clientes", "ausente"])).toEqual({
      clientes: [{ name: "Ana" }],
    });
    expect(sqlite.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("IN (?, ?)"),
      "clientes",
      "ausente",
    );
  });
  test("mantiene el turno de lectura hasta terminar de capturar datos relacionados", async () => {
    const storage = new LocalStorageService();
    const captureStarted = Promise.withResolvers<void>();
    const finishCapture = Promise.withResolvers<void>();
    const order: string[] = [];
    const read = storage.readMany(["perfil"], async () => {
      captureStarted.resolve();
      await finishCapture.promise;
      order.push("lectura de logo");
    });
    await captureStarted.promise;
    sqlite.runAsync.mockImplementation(async () => {
      order.push("escritura");
    });
    const write = storage.write("perfil", {});
    await new Promise<void>((resolve) => setImmediate(resolve));
    finishCapture.resolve();
    await Promise.all([read, write]);
    expect(order).toEqual(["lectura de logo", "escritura"]);
  });
  test("reemplaza varias claves en una transacción y elimina las que no tienen valor", async () => {
    const storage = new LocalStorageService();
    await storage.replaceMany(["clientes", "presupuestos"], {
      clientes: ["Ana"],
    });
    expect(sqlite.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
    expect(sqlite.runAsync).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("INSERT INTO app_storage"),
      "clientes",
      '["Ana"]',
    );
    expect(sqlite.runAsync).toHaveBeenNthCalledWith(
      2,
      "DELETE FROM app_storage WHERE key = ?",
      "presupuestos",
    );
  });
  test("un reemplazo fallido se propaga y no bloquea las operaciones siguientes", async () => {
    const storage = new LocalStorageService();
    sqlite.withExclusiveTransactionAsync.mockRejectedValueOnce(
      new Error("Disco lleno"),
    );
    await expect(storage.replaceMany(["clientes"], {})).rejects.toThrow(
      "Disco lleno",
    );
    await expect(storage.readMany(["clientes"])).resolves.toEqual({});
  });
  test("reemplazar espera las modificaciones en curso para no perderlas", async () => {
    const storage = new LocalStorageService();
    const order: string[] = [];
    sqlite.runAsync.mockImplementation(async (sql: string) => {
      order.push(sql.startsWith("DELETE") ? "reemplazo" : "modificación");
    });
    const update = storage.update("clientes", () => ["Ana"]);
    const replace = storage.replaceMany(["clientes"], {});
    await Promise.all([update, replace]);
    expect(order).toEqual(["modificación", "reemplazo"]);
  });
  test("un fallo de SQLite a mitad de una restauración revierte todo y aísla lectores y escritores", async () => {
    const directory = mkdtempSync(join(tmpdir(), "nora-storage-"));
    const path = join(directory, "nora.db");
    const database = new DatabaseSync(path);
    const connection = (db: DatabaseSync) => ({
      getFirstAsync: async (sql: string, key: string) =>
        db.prepare(sql).get(key) ?? null,
      runAsync: async (sql: string, ...params: string[]) =>
        db.prepare(sql).run(...params),
    });
    let release!: () => void;
    const continueTransaction = new Promise<void>((resolve) => {
      release = resolve;
    });
    let firstWrite!: () => void;
    const staged = new Promise<void>((resolve) => {
      firstWrite = resolve;
    });
    sqlite.openDatabaseAsync.mockResolvedValue({
      ...connection(database),
      execAsync: async (sql: string) => database.exec(sql),
      withExclusiveTransactionAsync: async (
        task: (transaction: ReturnType<typeof connection>) => Promise<void>,
      ) => {
        const transaction = new DatabaseSync(path);
        try {
          transaction.exec("BEGIN");
          const conn = connection(transaction);
          await task({
            ...conn,
            runAsync: async (sql, ...params) => {
              const result = await conn.runAsync(sql, ...params);
              if (params[0] === "clientes") {
                firstWrite();
                await continueTransaction;
              }
              return result;
            },
          });
          transaction.exec("COMMIT");
        } catch (error) {
          transaction.exec("ROLLBACK");
          throw error;
        } finally {
          transaction.close();
        }
      },
    });
    try {
      const storage = new LocalStorageService();
      await storage.write("clientes", ["Original"]);
      await storage.write("presupuestos", ["Original"]);
      database.exec(`CREATE TRIGGER fail_replace BEFORE UPDATE ON app_storage
        WHEN NEW.key = 'presupuestos' BEGIN SELECT RAISE(ABORT, 'fallo en restauración'); END`);
      const restore = storage.replaceMany(["clientes", "presupuestos"], {
        clientes: ["Copia"],
        presupuestos: ["Copia"],
      });
      const checked = expect(restore).rejects.toThrow("fallo en restauración");
      await staged;
      const separateWrite = storage.write("perfil", "Nuevo");
      const duringRestore = await storage.read("clientes");
      release();
      await checked;
      await separateWrite;
      expect(duringRestore).toEqual(["Original"]);
      database.close();
      const reopened = new DatabaseSync(path);
      try {
        expect(
          reopened
            .prepare("SELECT key, value FROM app_storage ORDER BY key")
            .all(),
        ).toEqual([
          { key: "clientes", value: '["Original"]' },
          { key: "perfil", value: '"Nuevo"' },
          { key: "presupuestos", value: '["Original"]' },
        ]);
      } finally {
        reopened.close();
      }
    } finally {
      release();
      if (database.isOpen) database.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
  test("continúa procesando modificaciones tras un error de validación o guardado", async () => {
    const storage = new LocalStorageService();
    await expect(
      storage.update("clientes", () => {
        throw new Error("Datos inválidos");
      }),
    ).rejects.toThrow("Datos inválidos");
    sqlite.runAsync.mockRejectedValueOnce(new Error("Disco lleno"));
    await expect(storage.update("clientes", () => [])).rejects.toThrow(
      "Disco lleno",
    );
    await expect(
      storage.update("clientes", () => ["Ana"]),
    ).resolves.toBeUndefined();
    expect(sqlite.runAsync).toHaveBeenLastCalledWith(
      expect.any(String),
      "clientes",
      '["Ana"]',
    );
  });
});
