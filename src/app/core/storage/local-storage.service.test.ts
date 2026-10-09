import { beforeEach, describe, expect, test, vi } from "vitest";
import { LocalStorageService } from "./local-storage.service";

const sqlite = vi.hoisted(() => ({
  openDatabaseAsync: vi.fn(),
  execAsync: vi.fn(),
  getFirstAsync: vi.fn(),
  runAsync: vi.fn(),
}));
vi.mock("expo-sqlite", () => ({ openDatabaseAsync: sqlite.openDatabaseAsync }));

beforeEach(() => {
  vi.resetAllMocks();
  sqlite.openDatabaseAsync.mockResolvedValue(sqlite);
  sqlite.execAsync.mockResolvedValue(undefined);
  sqlite.getFirstAsync.mockResolvedValue(null);
  sqlite.runAsync.mockResolvedValue(undefined);
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
