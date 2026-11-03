import { Injectable } from "@angular/core";
import type { SQLiteDatabase } from "expo-sqlite";

@Injectable({ providedIn: "root" })
export class LocalStorageService {
  private database?: Promise<SQLiteDatabase>;
  private mutationQueue: Promise<unknown> = Promise.resolve();

  /** Lee JSON local; devuelve null si no existe. El tipo T no implica validación del contenido. */
  async read<T>(key: string): Promise<T | null> {
    const database = await this.open();
    const row = await database.getFirstAsync<{ value: string }>(
      "SELECT value FROM app_storage WHERE key = ?",
      key,
    );
    return row ? (JSON.parse(row.value) as T) : null;
  }

  async write<T>(key: string, value: T): Promise<void> {
    const database = await this.open();
    await database.runAsync(
      "INSERT INTO app_storage (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      key,
      JSON.stringify(value),
    );
  }

  /**
   * Serializa lectura, modificación y guardado para evitar perder cambios concurrentes.
   * La exclusión sólo aplica a llamadas a update en esta instancia, no a otros procesos ni a write.
   * Propaga el fallo al consumidor sin bloquear las siguientes operaciones de la cola.
   */
  update<T>(key: string, change: (current: T | null) => T): Promise<void> {
    return this.enqueue(async () => {
      const next = change(await this.read<T>(key));
      await this.write(key, next);
    });
  }

  /** Lee un conjunto de claves de forma coherente, después de las modificaciones en curso. */
  readMany(keys: readonly string[]): Promise<Record<string, unknown>> {
    return this.enqueue(async () => {
      const database = await this.open();
      const rows = await database.getAllAsync<{ key: string; value: string }>(
        `SELECT key, value FROM app_storage WHERE key IN (${keys.map(() => "?").join(", ")})`,
        ...keys,
      );
      return Object.fromEntries(
        rows.map((row) => [row.key, JSON.parse(row.value) as unknown]),
      );
    });
  }

  /**
   * Reemplaza todas las claves indicadas en una única transacción: o se aplican todas o ninguna.
   * Una clave sin valor en entries se elimina.
   */
  replaceMany(
    keys: readonly string[],
    entries: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    return this.enqueue(async () => {
      const database = await this.open();
      await database.withTransactionAsync(async () => {
        for (const key of keys) {
          if (Object.hasOwn(entries, key))
            await database.runAsync(
              "INSERT INTO app_storage (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
              key,
              JSON.stringify(entries[key]),
            );
          else
            await database.runAsync(
              "DELETE FROM app_storage WHERE key = ?",
              key,
            );
        }
      });
    });
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const operation = this.mutationQueue.then(task);
    this.mutationQueue = operation.catch(() => undefined);
    return operation;
  }

  private open(): Promise<SQLiteDatabase> {
    // Comparte la apertura en curso y permite reintentar si la inicialización falla.
    return (this.database ??= this.initialize().catch((error: unknown) => {
      this.database = undefined;
      throw error;
    }));
  }

  private async initialize(): Promise<SQLiteDatabase> {
    const { openDatabaseAsync } = await import("expo-sqlite");
    const database = await openDatabaseAsync("nora.db");
    await database.execAsync(
      "CREATE TABLE IF NOT EXISTS app_storage (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)",
    );
    return database;
  }
}
